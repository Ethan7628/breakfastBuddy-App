import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const validateConfirmPayment = (data: any) => {
  const errors: string[] = [];
  
  if (!data.transactionId && !data.txRef) {
    errors.push('transactionId or txRef is required');
  }
  
  if (data.orderId && !UUID_REGEX.test(data.orderId)) {
    errors.push('orderId must be a valid UUID');
  }
  
  if (data.txRef && (typeof data.txRef !== 'string' || data.txRef.length > 100)) {
    errors.push('txRef must be a string (max 100 chars)');
  }
  
  return errors;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[CONFIRM-PAYMENT] Function started');
    
    // 1. Verify authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('[CONFIRM-PAYMENT] Missing authorization header');
      return new Response(JSON.stringify({ 
        error: 'Authentication required' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client with user context
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
      console.error('[CONFIRM-PAYMENT] Authentication failed:', authError);
      return new Response(JSON.stringify({ 
        error: 'Invalid authentication' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[CONFIRM-PAYMENT] Authenticated user:', user.id);
    
    // Get request data
    const requestData = await req.json();
    
    // 2. Validate input
    const validationErrors = validateConfirmPayment(requestData);
    if (validationErrors.length > 0) {
      console.error('[CONFIRM-PAYMENT] Validation failed:', validationErrors);
      return new Response(JSON.stringify({ 
        error: 'Invalid request data',
        details: validationErrors
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { transactionId, txRef, orderId } = requestData;
    console.log('[CONFIRM-PAYMENT] Request validated');

    // 3. Verify user owns the order (if orderId provided)
    if (orderId) {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('firebase_user_id')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        console.error('[CONFIRM-PAYMENT] Order not found');
        return new Response(JSON.stringify({ 
          error: 'Order not found' 
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (order.firebase_user_id !== user.id) {
        console.error('[CONFIRM-PAYMENT] User does not own this order');
        return new Response(JSON.stringify({ 
          error: 'Unauthorized action' 
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const flutterwaveSecretKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
    
    if (!flutterwaveSecretKey) {
      throw new Error('Payment service not configured');
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
    console.log('[CONFIRM-PAYMENT] Payment verification completed');

    if (verifyData.status !== 'success') {
      console.error('[CONFIRM-PAYMENT] Payment verification failed');
      return new Response(JSON.stringify({ 
        error: 'Payment verification failed. Please try again.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paymentData = verifyData.data;
    let paymentStatus = 'pending';

    // Map Flutterwave status to our status
    if (paymentData.status === 'successful') {
      paymentStatus = 'paid';
    } else if (paymentData.status === 'failed') {
      paymentStatus = 'failed';
    }

    // Update order in Supabase using service role to bypass RLS
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    const updateData: any = {
      payment_status: paymentStatus,
      updated_at: new Date().toISOString(),
      flutterwave_transaction_id: paymentData.id,
    };

    // Find order by orderId or txRef
    let query = supabaseService.from('orders').update(updateData);
    
    if (orderId) {
      query = query.eq('id', orderId);
    } else {
      query = query.eq('flutterwave_tx_ref', txRef);
    }

    const { data: updatedOrder, error: updateError } = await query.select().single();

    if (updateError) {
      console.error('[CONFIRM-PAYMENT] Failed to update order');
      return new Response(JSON.stringify({ 
        error: 'Failed to update order status. Please contact support.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[CONFIRM-PAYMENT] Order updated successfully');

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
    console.error('[CONFIRM-PAYMENT] Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: 'Payment confirmation failed. Please try again or contact support.' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
