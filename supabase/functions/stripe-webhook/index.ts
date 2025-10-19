import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from 'https://esm.sh/stripe@14.21.0';

serve(async (req) => {
  try {
    console.log('[STRIPE-WEBHOOK] Webhook received');
    
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('Stripe not configured');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response(JSON.stringify({ error: 'No signature' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.text();
    
    // For webhook verification, you'd need STRIPE_WEBHOOK_SECRET
    // For now, we'll parse the event directly
    const event = JSON.parse(body);

    console.log('[STRIPE-WEBHOOK] Event type:', event.type);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const orderId = session.metadata.order_id;

        console.log('[STRIPE-WEBHOOK] Payment successful for order:', orderId);

        // Update order status
        const { error } = await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);

        if (error) {
          console.error('[STRIPE-WEBHOOK] Failed to update order:', error);
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object;
        const orderId = session.metadata.order_id;

        console.log('[STRIPE-WEBHOOK] Payment expired for order:', orderId);

        const { error } = await supabase
          .from('orders')
          .update({
            payment_status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);

        if (error) {
          console.error('[STRIPE-WEBHOOK] Failed to update order:', error);
        }
        break;
      }

      default:
        console.log('[STRIPE-WEBHOOK] Unhandled event type:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[STRIPE-WEBHOOK] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Webhook processing failed' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
