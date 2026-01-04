import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get MunoPay API base URL from environment or use default
const MUNOPAY_API_BASE = Deno.env.get('MUNOPAY_API_BASE') || 'https://payments.munopay.com/api/v1';

// Helper function to check if MunoPay API is reachable
async function checkMunoPayConnectivity(): Promise<boolean> {
  try {
    const response = await fetch(MUNOPAY_API_BASE, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    return response.status < 500;
  } catch (error) {
    console.error('[CREATE-MUNOPAY-PAYMENT] Connectivity check failed:', error);
    return false;
  }
}

// Helper function to retry fetch with exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 2): Promise<Response> {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      lastError = error;
      console.error(`[CREATE-MUNOPAY-PAYMENT] Attempt ${attempt + 1} failed:`, error);
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

interface PaymentItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface PaymentRequest {
  items: PaymentItem[];
  phone: string;
  customerEmail: string;
  customerName: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[CREATE-MUNOPAY-PAYMENT] Function started');

    // Get authenticated user - FIXED AUTHENTICATION FLOW
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[CREATE-MUNOPAY-PAYMENT] Missing authorization header');
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'unauthorized',
            message: 'Missing authorization header'
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      );
    }

    // Extract token from header
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      console.error('[CREATE-MUNOPAY-PAYMENT] Invalid authorization header format');
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'unauthorized',
            message: 'Invalid authorization header format'
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      );
    }

    // Initialize Supabase client with service key for server-side auth
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // Use service role key for server-side operations
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[CREATE-MUNOPAY-PAYMENT] Missing Supabase configuration');
      throw new Error('Server configuration error');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user's token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[CREATE-MUNOPAY-PAYMENT] Auth error:', authError);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'unauthorized',
            message: 'Invalid or expired token'
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      );
    }

    console.log('[CREATE-MUNOPAY-PAYMENT] Authenticated user:', user.id, user.email);

    // Parse request body
    let body: PaymentRequest;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('[CREATE-MUNOPAY-PAYMENT] JSON parse error:', parseError);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'invalid_request',
            message: 'Invalid JSON in request body'
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    const { items, phone, customerEmail, customerName } = body;
    
    console.log('[CREATE-MUNOPAY-PAYMENT] Request body:', { 
      itemsCount: items?.length, 
      phone, 
      customerEmail, 
      customerName 
    });

    // Validate and sanitize phone number
    if (!phone) {
      console.error('[CREATE-MUNOPAY-PAYMENT] Missing phone number');
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'invalid_phone',
            message: 'Phone number is required'
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Sanitize phone number - remove spaces, dashes, and plus signs
    const sanitizedPhone = phone.replace(/[\s\-\+]/g, '');
    console.log('[CREATE-MUNOPAY-PAYMENT] Original phone:', phone, 'Sanitized:', sanitizedPhone);

    // Validate phone format (256XXXXXXXXX for Uganda)
    if (!sanitizedPhone.match(/^256\d{9}$/)) {
      console.error('[CREATE-MUNOPAY-PAYMENT] Invalid phone format:', sanitizedPhone);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'invalid_phone',
            message: `Invalid phone number format. Expected 256XXXXXXXXX, got: ${sanitizedPhone}`
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Validate items
    if (!items || items.length === 0) {
      console.error('[CREATE-MUNOPAY-PAYMENT] Empty or missing items array');
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'invalid_items',
            message: 'Cart items are required'
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Calculate total from items
    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    console.log('[CREATE-MUNOPAY-PAYMENT] Total amount:', totalAmount, 'UGX');

    // Validate total amount
    if (totalAmount <= 0) {
      console.error('[CREATE-MUNOPAY-PAYMENT] Invalid amount:', totalAmount);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'invalid_amount',
            message: 'Total amount must be greater than 0'
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Check MunoPay connectivity before proceeding
    console.log('[CREATE-MUNOPAY-PAYMENT] Checking MunoPay connectivity...');
    const isConnectable = await checkMunoPayConnectivity();
    if (!isConnectable) {
      console.error('[CREATE-MUNOPAY-PAYMENT] MunoPay service is unreachable');
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'gateway_unreachable',
            message: 'Payment gateway is currently unreachable. Please try again later.'
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 503
        }
      );
    }

    // Create order in database first
    console.log('[CREATE-MUNOPAY-PAYMENT] Creating order for user:', user.id);
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        old_firebase_user_id: user.id, // Required field for backward compatibility
        items: items,
        total_amount: totalAmount,
        currency: 'UGX',
        payment_status: 'pending',
      })
      .select()
      .single();

    if (orderError) {
      console.error('[CREATE-MUNOPAY-PAYMENT] Order creation error:', orderError);
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    console.log('[CREATE-MUNOPAY-PAYMENT] Order created successfully:', order.id);

    // Create MunoPay payment request
    const munoPayApiKey = Deno.env.get('MUNOPAY_SECRET_KEY');
    if (!munoPayApiKey) {
      console.error('[CREATE-MUNOPAY-PAYMENT] MunoPay API key not configured');
      throw new Error('MunoPay API key not configured');
    }

    console.log('[CREATE-MUNOPAY-PAYMENT] MunoPay API key found:', munoPayApiKey.substring(0, 10) + '...');

    // Get MunoPay account number from environment
    const munoPayAccountNumber = Deno.env.get('MUNOPAY_ACCOUNT_NUMBER');
    if (!munoPayAccountNumber) {
      console.error('[CREATE-MUNOPAY-PAYMENT] MunoPay account number not configured');
      throw new Error('MunoPay account number not configured');
    }

    const paymentPayload = {
      account_number: munoPayAccountNumber,
      reference: order.id,
      phone: sanitizedPhone,
      amount: totalAmount,
      description: `Order #${order.id.substring(0, 8)}`,
      email: customerEmail,
      names: customerName,
    };

    console.log('[CREATE-MUNOPAY-PAYMENT] Creating MunoPay payment with payload:', JSON.stringify(paymentPayload, null, 2));

    const munoPayUrl = `${MUNOPAY_API_BASE}/deposit`;
    console.log('[CREATE-MUNOPAY-PAYMENT] MunoPay URL:', munoPayUrl);

    const munoPayResponse = await fetchWithRetry(munoPayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${munoPayApiKey}`,
      },
      body: JSON.stringify(paymentPayload),
    });

    console.log('[CREATE-MUNOPAY-PAYMENT] MunoPay response status:', munoPayResponse.status);

    const responseText = await munoPayResponse.text();
    console.log('[CREATE-MUNOPAY-PAYMENT] MunoPay raw response:', responseText);

    if (!munoPayResponse.ok) {
      console.error('[CREATE-MUNOPAY-PAYMENT] MunoPay API error. Status:', munoPayResponse.status, 'Body:', responseText);
      
      // Try to parse error response
      let errorMessage = `MunoPay API error (${munoPayResponse.status})`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.error || errorMessage;
        console.error('[CREATE-MUNOPAY-PAYMENT] Parsed error:', errorData);
      } catch (e) {
        console.error('[CREATE-MUNOPAY-PAYMENT] Could not parse error response');
      }
      
      throw new Error(errorMessage);
    }

    let munoPayData;
    try {
      munoPayData = JSON.parse(responseText);
      console.log('[CREATE-MUNOPAY-PAYMENT] MunoPay success response:', JSON.stringify(munoPayData, null, 2));
    } catch (e) {
      console.error('[CREATE-MUNOPAY-PAYMENT] Failed to parse MunoPay response:', e);
      throw new Error('Invalid response from MunoPay API');
    }

    // Update order with transaction ID
    if (munoPayData.transaction_id) {
      console.log('[CREATE-MUNOPAY-PAYMENT] Updating order with transaction ID:', munoPayData.transaction_id);
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          stripe_payment_intent_id: munoPayData.transaction_id // Reusing this field for MunoPay transaction ID
        })
        .eq('id', order.id);
      
      if (updateError) {
        console.error('[CREATE-MUNOPAY-PAYMENT] Failed to update order with transaction ID:', updateError);
      } else {
        console.log('[CREATE-MUNOPAY-PAYMENT] Order updated successfully');
      }
    }

    console.log('[CREATE-MUNOPAY-PAYMENT] Payment request successful');
    return new Response(
      JSON.stringify({
        success: true,
        orderId: order.id,
        transactionId: munoPayData.transaction_id,
        data: munoPayData,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[CREATE-MUNOPAY-PAYMENT] Unexpected error:', error);
    console.error('[CREATE-MUNOPAY-PAYMENT] Error stack:', error instanceof Error ? error.stack : 'N/A');
    
    // Classify error types
    let errorCode = 'payment_failed';
    let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    let statusCode = 400;
    
    if (errorMessage.includes('gateway_unreachable')) {
      errorCode = 'gateway_unreachable';
      statusCode = 503;
    } else if (errorMessage.includes('dns error') || errorMessage.includes('lookup address')) {
      errorCode = 'gateway_unreachable';
      statusCode = 503;
    } else if (errorMessage.includes('Phone number') || errorMessage.includes('phone')) {
      errorCode = 'invalid_phone';
    } else if (errorMessage.includes('Unauthorized') || errorMessage.includes('authorization')) {
      errorCode = 'unauthorized';
      statusCode = 401;
    } else if (errorMessage.includes('JSON parse')) {
      errorCode = 'invalid_request';
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
          details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
        },
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
      }
    );
  }
});