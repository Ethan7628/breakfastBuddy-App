import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

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
    console.log('[CONFIRM-PAYMENT] Function started');
    
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get request data
    const { paymentIntentId, orderId } = await req.json();
    console.log('[CONFIRM-PAYMENT] Request data:', { paymentIntentId, orderId });

    if (!paymentIntentId || !orderId) {
      throw new Error('Missing required fields: paymentIntentId or orderId');
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log('[CONFIRM-PAYMENT] Payment intent status:', paymentIntent.status);

    // Determine payment status based on Stripe status
    let paymentStatus = 'pending';
    if (paymentIntent.status === 'succeeded') {
      paymentStatus = 'paid';
    } else if (paymentIntent.status === 'payment_failed' || paymentIntent.status === 'canceled') {
      paymentStatus = 'failed';
    }

    // Update order in Supabase
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({ 
        payment_status: paymentStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('[CONFIRM-PAYMENT] Order update error:', updateError);
      throw new Error(`Failed to update order: ${updateError.message}`);
    }

    console.log('[CONFIRM-PAYMENT] Order updated:', updatedOrder.id);

    return new Response(JSON.stringify({
      success: true,
      order: updatedOrder,
      paymentStatus: paymentStatus
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[CONFIRM-PAYMENT] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});