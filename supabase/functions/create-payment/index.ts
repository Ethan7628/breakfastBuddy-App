import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[CREATE-PAYMENT] Function started');
    
    const flutterwaveSecretKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
    
    if (!flutterwaveSecretKey) {
      throw new Error('FLUTTERWAVE_SECRET_KEY not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get request data
    const { firebaseUserId, items, totalAmount, paymentMethod, customerEmail, customerName, customerPhone } = await req.json();
    console.log('[CREATE-PAYMENT] Request data:', { firebaseUserId, totalAmount, paymentMethod });

    if (!firebaseUserId || !items || !totalAmount) {
      throw new Error('Missing required fields: firebaseUserId, items, or totalAmount');
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
    console.log('[CREATE-PAYMENT] Flutterwave response:', flutterwaveData);

    if (flutterwaveData.status !== 'success') {
      console.error('[CREATE-PAYMENT] Flutterwave error:', flutterwaveData);
      throw new Error(flutterwaveData.message || 'Failed to create payment');
    }

    // Create order in Supabase
    const orderData = {
      firebase_user_id: firebaseUserId,
      items: items,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      payment_status: 'pending',
      flutterwave_tx_ref: txRef,
      flutterwave_payment_link: flutterwaveData.data.link,
    };

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) {
      console.error('[CREATE-PAYMENT] Order creation error:', orderError);
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    console.log('[CREATE-PAYMENT] Order created:', order.id);

    return new Response(JSON.stringify({
      paymentLink: flutterwaveData.data.link,
      orderId: order.id,
      txRef: txRef,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[CREATE-PAYMENT] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});