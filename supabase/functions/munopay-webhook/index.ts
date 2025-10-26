import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[MUNOPAY-WEBHOOK] Webhook received');

    // Verify webhook signature
    const webhookKey = Deno.env.get('MUNOPAY_WEBHOOK_KEY');
    const signature = req.headers.get('x-munopay-signature') || req.headers.get('authorization');
    
    if (webhookKey && signature) {
      // Remove 'Bearer ' prefix if present
      const cleanSignature = signature.replace('Bearer ', '');
      if (cleanSignature !== webhookKey) {
        console.error('[MUNOPAY-WEBHOOK] Invalid signature');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }
      console.log('[MUNOPAY-WEBHOOK] Signature verified');
    }

    // Parse webhook payload
    const payload = await req.json();
    console.log('[MUNOPAY-WEBHOOK] Payload:', JSON.stringify(payload, null, 2));

    // Initialize Supabase client with service role key for admin access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract event data
    const { event_type, transaction_id, reference, status } = payload;

    if (!reference) {
      console.error('[MUNOPAY-WEBHOOK] No reference (order ID) in webhook');
      return new Response(
        JSON.stringify({ received: true, error: 'No reference' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log('[MUNOPAY-WEBHOOK] Event type:', event_type, 'Status:', status);

    // Map MunoPay status to our payment_status
    let paymentStatus = 'pending';
    
    if (status === 'success' || status === 'completed' || event_type === 'payment.success') {
      paymentStatus = 'completed';
    } else if (status === 'failed' || event_type === 'payment.failed') {
      paymentStatus = 'failed';
    } else if (status === 'cancelled' || status === 'expired') {
      paymentStatus = 'cancelled';
    }

    console.log('[MUNOPAY-WEBHOOK] Updating order:', reference, 'to status:', paymentStatus);

    // Update order in database
    const { data, error } = await supabase
      .from('orders')
      .update({
        payment_status: paymentStatus,
        stripe_payment_intent_id: transaction_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reference)
      .select()
      .single();

    if (error) {
      console.error('[MUNOPAY-WEBHOOK] Error updating order:', error);
      throw error;
    }

    console.log('[MUNOPAY-WEBHOOK] Order updated successfully:', data);

    // If payment is successful, clear the user's cart
    if (paymentStatus === 'completed' && data?.user_id) {
      const { error: cartError } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', data.user_id);

      if (cartError) {
        console.error('[MUNOPAY-WEBHOOK] Error clearing cart:', cartError);
      } else {
        console.log('[MUNOPAY-WEBHOOK] Cart cleared for user:', data.user_id);
      }
    }

    return new Response(
      JSON.stringify({ received: true, status: paymentStatus }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[MUNOPAY-WEBHOOK] Error processing webhook:', error);
    return new Response(
      JSON.stringify({ 
        received: true, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});
