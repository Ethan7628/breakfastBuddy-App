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
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('[CREATE-MUNOPAY-PAYMENT] Authenticated user:', user.id);

    // Parse request body
    const body: PaymentRequest = await req.json();
    const { items, phone, customerEmail, customerName } = body;

    // Validate phone number
    if (!phone || !phone.match(/^256\d{9}$/)) {
      throw new Error('Invalid phone number. Must be in format 256XXXXXXXXX');
    }

    // Calculate total from items
    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    console.log('[CREATE-MUNOPAY-PAYMENT] Total amount:', totalAmount, 'UGX');

    // Create order in database first
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
      throw new Error('Failed to create order');
    }

    console.log('[CREATE-MUNOPAY-PAYMENT] Order created:', order.id);

    // Create MunoPay payment request
    const munoPayApiKey = Deno.env.get('MUNOPAY_SECRET_KEY');
    if (!munoPayApiKey) {
      throw new Error('MunoPay API key not configured');
    }

    const paymentPayload = {
      amount: totalAmount,
      currency: 'UGX',
      phone: phone,
      description: `Order #${order.id.substring(0, 8)}`,
      reference: order.id,
    };

    console.log('[CREATE-MUNOPAY-PAYMENT] Creating MunoPay payment:', paymentPayload);

    const munoPayResponse = await fetch('https://api.munopay.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${munoPayApiKey}`,
      },
      body: JSON.stringify(paymentPayload),
    });

    if (!munoPayResponse.ok) {
      const errorText = await munoPayResponse.text();
      console.error('[CREATE-MUNOPAY-PAYMENT] MunoPay API error:', errorText);
      throw new Error(`MunoPay API error: ${munoPayResponse.status}`);
    }

    const munoPayData = await munoPayResponse.json();
    console.log('[CREATE-MUNOPAY-PAYMENT] MunoPay response:', munoPayData);

    // Update order with transaction ID
    if (munoPayData.transaction_id) {
      await supabase
        .from('orders')
        .update({ 
          stripe_payment_intent_id: munoPayData.transaction_id // Reusing this field for MunoPay transaction ID
        })
        .eq('id', order.id);
    }

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
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
