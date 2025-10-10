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
    console.log('[CONFIRM-PAYMENT] Function started');
    
    const flutterwaveSecretKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
    
    if (!flutterwaveSecretKey) {
      throw new Error('FLUTTERWAVE_SECRET_KEY not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get request data
    const { transactionId, txRef, orderId } = await req.json();
    console.log('[CONFIRM-PAYMENT] Request data:', { transactionId, txRef, orderId });

    if (!transactionId && !txRef) {
      throw new Error('Transaction ID or tx_ref is required');
    }

    // Verify payment with Flutterwave
    const verifyUrl = transactionId 
      ? `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`
      : `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${txRef}`;

    const verifyResponse = await fetch(verifyUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${flutterwaveSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const verifyData = await verifyResponse.json();
    console.log('[CONFIRM-PAYMENT] Flutterwave verification:', verifyData);

    if (verifyData.status !== 'success') {
      console.error('[CONFIRM-PAYMENT] Flutterwave verification error:', verifyData);
      throw new Error('Payment verification failed');
    }

    const paymentData = verifyData.data;
    let paymentStatus = 'pending';

    // Map Flutterwave status to our status
    if (paymentData.status === 'successful') {
      paymentStatus = 'paid';
    } else if (paymentData.status === 'failed') {
      paymentStatus = 'failed';
    }

    // Update order in Supabase
    const updateData: any = {
      payment_status: paymentStatus,
      updated_at: new Date().toISOString(),
      flutterwave_transaction_id: paymentData.id,
    };

    // Find order by orderId or txRef
    let query = supabase.from('orders').update(updateData);
    
    if (orderId) {
      query = query.eq('id', orderId);
    } else {
      query = query.eq('flutterwave_tx_ref', txRef);
    }

    const { data: updatedOrder, error: updateError } = await query.select().single();

    if (updateError) {
      console.error('[CONFIRM-PAYMENT] Order update error:', updateError);
      throw new Error(`Failed to update order: ${updateError.message}`);
    }

    console.log('[CONFIRM-PAYMENT] Order updated:', updatedOrder.id);

    return new Response(JSON.stringify({
      success: true,
      order: updatedOrder,
      paymentStatus: paymentStatus,
      transactionId: paymentData.id,
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