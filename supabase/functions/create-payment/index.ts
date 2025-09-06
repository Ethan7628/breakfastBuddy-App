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
    console.log('[CREATE-PAYMENT] Function started');
    
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get request data
    const { firebaseUserId, items, totalAmount, paymentMethod } = await req.json();
    console.log('[CREATE-PAYMENT] Request data:', { firebaseUserId, totalAmount, paymentMethod });

    if (!firebaseUserId || !items || !totalAmount) {
      throw new Error('Missing required fields: firebaseUserId, items, or totalAmount');
    }

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: 'ugx',
      payment_method_types: paymentMethod === 'mobile_money' ? ['card'] : ['card'], // For now, we'll use card for both
      metadata: {
        firebaseUserId,
        paymentMethod: paymentMethod || 'card'
      },
    });

    console.log('[CREATE-PAYMENT] Payment intent created:', paymentIntent.id);

    // Create order in Supabase
    const orderData = {
      firebase_user_id: firebaseUserId,
      items: items,
      total_amount: Math.round(totalAmount * 100), // Store in cents
      currency: 'ugx',
      payment_status: 'pending',
      stripe_payment_intent_id: paymentIntent.id,
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
      clientSecret: paymentIntent.client_secret,
      orderId: order.id,
      paymentIntentId: paymentIntent.id
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