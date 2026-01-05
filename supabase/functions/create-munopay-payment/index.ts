import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== CREATE-MUNOPAY-PAYMENT STARTED ===");
    
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const munoPayApiKey = Deno.env.get("MUNOPAY_API_KEY");
    const munoPayAccountNumber = Deno.env.get("MUNOPAY_ACCOUNT_NUMBER");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase configuration");
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Server configuration error" 
        }),
        { headers: corsHeaders, status: 500 }
      );
    }

    // Parse request body
    const body = await req.json();
    console.log("Received body:", JSON.stringify(body, null, 2));
    
    // Extract fields
    const phone = body?.phone;
    const totalAmount = body?.totalAmount || body?.amount;
    const items = body?.items || [];
    const customerEmail = body?.customerEmail || '';
    const customerName = body?.customerName || '';

    // Validate
    if (!phone || !totalAmount) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Phone and amount are required" 
        }),
        { headers: corsHeaders, status: 400 }
      );
    }

    const amount = Number(totalAmount);
    if (isNaN(amount) || amount <= 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Valid amount required (> 0)" 
        }),
        { headers: corsHeaders, status: 400 }
      );
    }

    // Format phone (MunoPay expects 256XXXXXXXXX)
    const formatPhone = (phone: string): string => {
      let cleaned = phone.replace(/\D/g, "");
      if (cleaned.startsWith("0")) {
        return "256" + cleaned.substring(1);
      } else if (!cleaned.startsWith("256")) {
        return "256" + cleaned;
      }
      return cleaned;
    };

    const formattedPhone = formatPhone(phone);
    console.log("Formatted phone:", formattedPhone);

    // Initialize Supabase
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user ID from JWT
    const authHeader = req.headers.get("Authorization");
    let userId = crypto.randomUUID();
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      try {
        const base64Url = token.split('.')[1];
        if (base64Url) {
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(atob(base64));
          userId = payload.sub || userId;
        }
      } catch (e) {
        console.log("Using generated user ID");
      }
    }

    // ========== 1. CREATE ORDER IN DATABASE ==========
    console.log("Creating order...");
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: userId,
        items: items,
        total_amount: amount,
        currency: 'UGX',
        payment_status: 'initiated',
        customer_phone: formattedPhone,
        customer_email: customerEmail || '',
        customer_name: customerName || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (orderError) {
      throw new Error(`Order creation failed: ${orderError.message}`);
    }

    console.log("Order created:", order.id);

    // ========== 2. CHECK IF MUNOPAY IS CONFIGURED ==========
    if (!munoPayApiKey || !munoPayAccountNumber) {
      console.log("MunoPay not configured");
      
      await supabaseAdmin
        .from('orders')
        .update({
          payment_status: 'gateway_not_configured'
        })
        .eq('id', order.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Order created but MunoPay not configured",
          data: {
            orderId: order.id,
            amount: amount,
            phone: formattedPhone,
            status: "order_created",
            note: "Configure MUNOPAY_API_KEY and MUNOPAY_ACCOUNT_NUMBER environment variables"
          }
        }),
        { headers: corsHeaders }
      );
    }

    // ========== 3. CALL REAL MUNOPAY API ==========
    console.log("Calling MunoPay API to initiate payment...");
    
    // Prepare MunoPay request according to their API documentation
    const munoPayPayload = {
      account_number: munoPayAccountNumber,
      reference: `ORDER-${order.id.substring(0, 8)}-${Date.now()}`,
      phone: formattedPhone,
      amount: amount,
      currency: 'UGX',
      email: customerEmail || '',
      names: customerName || '',
      description: `Payment for order ${order.id.substring(0, 8)}`
    };

    console.log("MunoPay payload:", munoPayPayload);

    const munoPayUrl = "https://payments.munopay.com/api/v1/deposit";
    console.log("Calling MunoPay at:", munoPayUrl);

    try {
      const munoPayResponse = await fetch(munoPayUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${munoPayApiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(munoPayPayload),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      console.log("MunoPay response status:", munoPayResponse.status);

      if (!munoPayResponse.ok) {
        const errorText = await munoPayResponse.text();
        console.error("MunoPay API error:", munoPayResponse.status, errorText);
        
        // Update order to failed status
        await supabaseAdmin
          .from('orders')
          .update({
            payment_status: 'failed',
            payment_gateway_response: { 
              status: munoPayResponse.status,
              error: errorText
            }
          })
          .eq('id', order.id);

        throw new Error(`MunoPay API error (${munoPayResponse.status}): ${errorText.substring(0, 100)}`);
      }

      const munoPayData = await munoPayResponse.json();
      console.log("MunoPay success response:", munoPayData);

      // ========== 4. UPDATE ORDER WITH MUNOPAY TRANSACTION ==========
      await supabaseAdmin
        .from('orders')
        .update({
          payment_status: 'pending',
          stripe_payment_intent_id: munoPayData.transaction_id || munoPayData.payment_id || munoPayData.id,
          payment_gateway: 'munopay',
          payment_gateway_response: munoPayData,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      // ========== 5. RETURN SUCCESS ==========
      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment initiated successfully",
          data: {
            orderId: order.id,
            transactionId: munoPayData.transaction_id || munoPayData.payment_id || munoPayData.id,
            amount: amount,
            phone: formattedPhone,
            instructions: munoPayData.instructions || "Check your phone for payment prompt",
            reference: munoPayData.reference || munoPayPayload.reference,
            paymentStatus: "pending",
            note: "Please approve the payment on your phone"
          }
        }),
        { headers: corsHeaders }
      );

    } catch (munoPayError: any) {
      console.error("MunoPay API call failed:", munoPayError);
      
      // Update order to reflect gateway issue
      await supabaseAdmin
        .from('orders')
        .update({
          payment_status: 'gateway_error',
          payment_gateway_response: { 
            error: munoPayError.message
          }
        })
        .eq('id', order.id);

      // Return order created but payment failed
      return new Response(
        JSON.stringify({
          success: true,
          message: "Order created but payment gateway error",
          data: {
            orderId: order.id,
            amount: amount,
            phone: formattedPhone,
            status: "order_created_gateway_error",
            note: `Order saved. Payment gateway error: ${munoPayError.message}. Contact support.`
          }
        }),
        { headers: corsHeaders }
      );
    }

  } catch (error: any) {
    console.error("Error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Payment processing failed",
        note: "Please try again or contact support"
      }),
      { headers: corsHeaders, status: 500 }
    );
  }
});