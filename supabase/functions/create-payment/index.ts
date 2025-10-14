import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Zod-like validation schemas (inline to avoid external dependencies)
const validateCreatePayment = (data: any) => {
  const errors: string[] = [];
  
  if (!data.firebaseUserId || typeof data.firebaseUserId !== 'string') {
    errors.push('firebaseUserId must be a string');
  }
  
  if (!Array.isArray(data.items) || data.items.length === 0 || data.items.length > 100) {
    errors.push('items must be an array with 1-100 items');
  } else {
    data.items.forEach((item: any, idx: number) => {
      if (!item.name || typeof item.name !== 'string' || item.name.length > 200) {
        errors.push(`items[${idx}].name must be a string (max 200 chars)`);
      }
      if (typeof item.price !== 'number' || item.price <= 0 || item.price > 10000000) {
        errors.push(`items[${idx}].price must be positive number (max 10,000,000)`);
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0 || item.quantity > 1000 || !Number.isInteger(item.quantity)) {
        errors.push(`items[${idx}].quantity must be positive integer (max 1000)`);
      }
    });
  }
  
  if (typeof data.totalAmount !== 'number' || data.totalAmount <= 0 || data.totalAmount > 10000000) {
    errors.push('totalAmount must be positive number (max 10,000,000)');
  }
  
  if (!['card', 'mobile_money'].includes(data.paymentMethod)) {
    errors.push('paymentMethod must be "card" or "mobile_money"');
  }
  
  return errors;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[CREATE-PAYMENT] Function started');
    
    // 1. Verify authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('[CREATE-PAYMENT] Missing authorization header');
      return new Response(JSON.stringify({ 
        error: 'Authentication required' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[CREATE-PAYMENT] Authentication failed:', authError);
      return new Response(JSON.stringify({ 
        error: 'Invalid authentication' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[CREATE-PAYMENT] Authenticated user:', user.id);
    
    // Get request data
    const requestData = await req.json();
    
    // 2. Validate input
    const validationErrors = validateCreatePayment(requestData);
    if (validationErrors.length > 0) {
      console.error('[CREATE-PAYMENT] Validation failed:', validationErrors);
      return new Response(JSON.stringify({ 
        error: 'Invalid request data',
        details: validationErrors
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { items, totalAmount, paymentMethod, customerEmail, customerName, customerPhone } = requestData;
    
    // 3. Verify user is creating order for themselves
    if (requestData.firebaseUserId !== user.id) {
      console.error('[CREATE-PAYMENT] User ID mismatch');
      return new Response(JSON.stringify({ 
        error: 'Unauthorized action' 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[CREATE-PAYMENT] Request validated:', { userId: user.id, totalAmount, paymentMethod });

    const flutterwaveSecretKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
    
    if (!flutterwaveSecretKey) {
      throw new Error('Payment service not configured');
    }

    // Generate a unique transaction reference
    const txRef = `FW-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Create payment with Flutterwave
    const flutterwaveResponse = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${flutterwaveSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref: txRef,
        amount: totalAmount,
        currency: 'UGX',
        redirect_url: `${req.headers.get('origin') || 'https://vmvvvpqwwhybqzxewksd.supabase.co'}/payment-callback`,
        payment_options: paymentMethod === 'mobile_money' ? 'mobilemoneyuganda' : 'card',
        customer: {
          email: customerEmail || 'customer@example.com',
          name: customerName || 'Customer',
          phonenumber: customerPhone || '',
        },
        customizations: {
          title: 'Breakfast Order Payment',
          description: 'Payment for breakfast order',
        },
      }),
    });

    const flutterwaveData = await flutterwaveResponse.json();
    console.log('[CREATE-PAYMENT] Flutterwave response status:', flutterwaveData.status);

    if (flutterwaveData.status !== 'success') {
      console.error('[CREATE-PAYMENT] Payment service error');
      return new Response(JSON.stringify({ 
        error: 'Payment processing failed. Please try again.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create order in Supabase using service role to bypass RLS
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    const orderData = {
      firebase_user_id: user.id,
      items: items,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      payment_status: 'pending',
      flutterwave_tx_ref: txRef,
      flutterwave_payment_link: flutterwaveData.data.link,
    };

    const { data: order, error: orderError } = await supabaseService
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) {
      console.error('[CREATE-PAYMENT] Database error');
      return new Response(JSON.stringify({ 
        error: 'Failed to create order. Please try again.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[CREATE-PAYMENT] Order created successfully');

    return new Response(JSON.stringify({
      paymentLink: flutterwaveData.data.link,
      orderId: order.id,
      txRef: txRef,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[CREATE-PAYMENT] Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: 'Payment processing failed. Please try again or contact support.' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
