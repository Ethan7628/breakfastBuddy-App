import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[CREATE-MUNOPAY-PAYMENT] Missing authorization header');
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[CREATE-MUNOPAY-PAYMENT] Auth error:', authError);
      throw new Error('Unauthorized');
    }

    console.log('[CREATE-MUNOPAY-PAYMENT] Authenticated user:', user.id);

    // Parse request body
    const body: PaymentRequest = await req.json();
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
      throw new Error('Phone number is required');
    }

    // Sanitize phone number - remove spaces, dashes, and plus signs
    const sanitizedPhone = phone.replace(/[\s\-\+]/g, '');
    console.log('[CREATE-MUNOPAY-PAYMENT] Original phone:', phone, 'Sanitized:', sanitizedPhone);

    // Validate phone format (256XXXXXXXXX for Uganda)
    if (!sanitizedPhone.match(/^256\d{9}$/)) {
      console.error('[CREATE-MUNOPAY-PAYMENT] Invalid phone format:', sanitizedPhone);
      throw new Error(`Invalid phone number format. Expected 256XXXXXXXXX, got: ${sanitizedPhone}`);
    }

    // Validate items
    if (!items || items.length === 0) {
      console.error('[CREATE-MUNOPAY-PAYMENT] Empty or missing items array');
      throw new Error('Cart items are required');
    }

    // Calculate total from items
    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    console.log('[CREATE-MUNOPAY-PAYMENT] Total amount:', totalAmount, 'UGX');

    // Validate total amount
    if (totalAmount <= 0) {
      console.error('[CREATE-MUNOPAY-PAYMENT] Invalid amount:', totalAmount);
      throw new Error('Total amount must be greater than 0');
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

    const paymentPayload = {
      amount: totalAmount,
      currency: 'UGX',
      phone: sanitizedPhone,
      description: `Order #${order.id.substring(0, 8)}`,
      reference: order.id,
    };

    console.log('[CREATE-MUNOPAY-PAYMENT] Creating MunoPay payment with payload:', JSON.stringify(paymentPayload, null, 2));

    const munoPayResponse = await fetch('https://api.munopay.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${munoPayApiKey}`,
      },
      body: JSON.stringify(paymentPayload),
    });

    console.log('[CREATE-MUNOPAY-PAYMENT] MunoPay response status:', munoPayResponse.status);
    console.log('[CREATE-MUNOPAY-PAYMENT] MunoPay response headers:', JSON.stringify(Object.fromEntries(munoPayResponse.headers)));

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
    
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          details: error instanceof Error ? error.stack : undefined,
        },
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
