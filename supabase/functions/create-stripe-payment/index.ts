import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[CREATE-STRIPE-PAYMENT] Function started');
    
    // Verify authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('[CREATE-STRIPE-PAYMENT] Missing authorization header');
      return new Response(JSON.stringify({ 
        error: 'Authentication required' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[CREATE-STRIPE-PAYMENT] Authentication failed:', authError);
      return new Response(JSON.stringify({ 
        error: 'Invalid authentication' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[CREATE-STRIPE-PAYMENT] Authenticated user:', user.id);
    
    const requestData = await req.json();
    const { items, customerEmail, customerName } = requestData;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'Items are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Stripe
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('Stripe not configured');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Get authoritative prices from database
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    const itemIds = items.map((item: any) => item.id);
    const { data: dbItems, error: dbError } = await supabaseService
      .from('menu_items')
      .select('id, name, price')
      .in('id', itemIds);

    if (dbError || !dbItems) {
      console.error('[CREATE-STRIPE-PAYMENT] Failed to fetch menu items:', dbError);
      return new Response(JSON.stringify({ 
        error: 'Failed to validate items' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create line items with authoritative prices
    const lineItems = items.map((item: any) => {
      const dbItem = dbItems.find(db => db.id === item.id);
      if (!dbItem) {
        throw new Error(`Item not found: ${item.id}`);
      }

      return {
        price_data: {
          currency: 'ugx',
          product_data: {
            name: dbItem.name,
          },
          unit_amount: dbItem.price, // Stripe uses smallest currency unit
        },
        quantity: item.quantity,
      };
    });

    // Calculate total from database prices
    const calculatedTotal = items.reduce((sum: number, item: any) => {
      const dbItem = dbItems.find(db => db.id === item.id);
      return sum + (dbItem ? dbItem.price * item.quantity : 0);
    }, 0);

    // Create order in database first
    const { data: order, error: orderError } = await supabaseService
      .from('orders')
      .insert({
        user_id: user.id,
        old_firebase_user_id: user.id,
        items: items,
        total_amount: calculatedTotal,
        currency: 'ugx',
        payment_status: 'pending',
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('[CREATE-STRIPE-PAYMENT] Failed to create order:', orderError);
      return new Response(JSON.stringify({ 
        error: 'Failed to create order' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[CREATE-STRIPE-PAYMENT] Order created:', order.id);

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/orders?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/menu`,
      customer_email: customerEmail,
      metadata: {
        order_id: order.id,
        user_id: user.id,
      },
    });

    // Update order with Stripe session ID
    await supabaseService
      .from('orders')
      .update({
        stripe_payment_intent_id: session.id,
      })
      .eq('id', order.id);

    console.log('[CREATE-STRIPE-PAYMENT] Stripe session created:', session.id);

    return new Response(JSON.stringify({
      success: true,
      sessionUrl: session.url,
      orderId: order.id,
      sessionId: session.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[CREATE-STRIPE-PAYMENT] Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Payment creation failed' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
