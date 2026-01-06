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
    
    // Generate the reference BEFORE creating the order so we can store it immediately
    const orderId = crypto.randomUUID();
    const reference = `ORDER_${orderId.substring(0, 8)}_${Date.now()}`;
    
    console.log("Generated order ID:", orderId);
    console.log("Generated reference:", reference);
    
    // Create order with initial payment_gateway_response containing the reference
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        id: orderId,
        user_id: userId,
        items: items,
        total_amount: amount,
        currency: 'UGX',
        payment_status: 'initiated',
        customer_phone: formattedPhone,
        customer_email: customerEmail || '',
        customer_name: customerName || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // CRITICAL: Store reference immediately when creating order
        payment_gateway_response: {
          reference: reference,
          metadata: {
            order_id: orderId,
            user_id: userId,
            items: items,
            order_reference: reference
          },
          stored_at: new Date().toISOString()
        }
      })
      .select('id, payment_gateway_response')
      .single();

    if (orderError) {
      throw new Error(`Order creation failed: ${orderError.message}`);
    }

    console.log("Order created:", order.id);
    console.log("Reference stored in payment_gateway_response:", order.payment_gateway_response?.reference);

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
            note: "Configure MUNOPAY_API_KEY and MUNOPAY_ACCOUNT_NUMBER environment variables",
            reference: reference
          }
        }),
        { headers: corsHeaders }
      );
    }

    // ========== 3. CALL REAL MUNOPAY API ==========
    console.log("Calling MunoPay API to initiate payment...");
    
    // Prepare MunoPay request - USING CORRECT ENDPOINT STRUCTURE FROM DOCS
    const munoPayPayload = {
      account_number: munoPayAccountNumber,
      reference: reference,
      phone: formattedPhone,
      amount: amount,
      currency: 'UGX',
      email: customerEmail || '',
      names: customerName || '',
      description: `Payment for order ${order.id.substring(0, 8)}`,
      callback_url: 'https://vmvvvpqwwhybqzxewksd.supabase.co/functions/v1/munopay-webhook',
      // Add metadata that will be returned in webhook
      metadata: {
        order_id: order.id,
        user_id: userId,
        items: items,
        order_reference: reference
      }
    };

    console.log("MunoPay payload:", JSON.stringify(munoPayPayload, null, 2));
    console.log("Webhook URL: https://vmvvvpqwwhybqzxewksd.supabase.co/functions/v1/munopay-webhook");

    // CORRECT ENDPOINT: https://payments.munopay.com/api/v1/deposit
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
        
        // Parse error message
        let errorMessage = `MunoPay API error (${munoPayResponse.status})`;
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.message) {
            errorMessage = errorData.message;
            
            // Special handling for IP whitelist error
            if (errorMessage.includes("IP address") && errorMessage.includes("not authorized")) {
              errorMessage += " - Please whitelist Supabase Edge Function IPs in your MunoPay dashboard";
            }
          }
        } catch (e) {
          // Not JSON, use text as is
        }
        
        // Update order to failed status - PRESERVE THE REFERENCE
        await supabaseAdmin
          .from('orders')
          .update({
            payment_status: 'failed',
            payment_gateway_response: {
              ...order.payment_gateway_response, // PRESERVE existing reference
              muno_pay_error: errorText,
              muno_pay_status: munoPayResponse.status,
              error_occurred_at: new Date().toISOString()
            }
          })
          .eq('id', order.id);

        throw new Error(errorMessage);
      }

      const munoPayData = await munoPayResponse.json();
      console.log("MunoPay success response:", munoPayData);

      // ========== 4. UPDATE ORDER WITH MUNOPAY TRANSACTION ==========
      // IMPORTANT: Preserve the original reference while adding MunoPay response
      const updatedPaymentGatewayResponse = {
        ...order.payment_gateway_response, // Keep the original reference
        muno_pay_response: munoPayData,
        transaction_id: munoPayData.transaction_id || munoPayData.payment_id || munoPayData.id,
        muno_pay_response_received_at: new Date().toISOString()
      };

      await supabaseAdmin
        .from('orders')
        .update({
          payment_status: 'pending',
          stripe_payment_intent_id: munoPayData.transaction_id || munoPayData.payment_id || munoPayData.id,
          payment_gateway: 'munopay',
          payment_gateway_response: updatedPaymentGatewayResponse,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      // ========== 5. RETURN SUCCESS ==========
      const responseData: any = {
        orderId: order.id,
        amount: amount,
        phone: formattedPhone,
        paymentStatus: "pending",
        note: "Please approve the payment on your phone",
        webhookConfigured: true,
        webhookUrl: "https://vmvvvpqwwhybqzxewksd.supabase.co/functions/v1/munopay-webhook",
        reference: reference, // This is CRITICAL for webhook matching
        transactionId: munoPayData.transaction_id || munoPayData.payment_id || munoPayData.id
      };

      // Add instructions if available
      if (munoPayData.instructions) {
        responseData.instructions = munoPayData.instructions;
      }

      console.log("Returning success response with reference:", reference);
      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment initiated successfully",
          data: responseData
        }),
        { headers: corsHeaders }
      );

    } catch (munoPayError: any) {
      console.error("MunoPay API call failed:", munoPayError);
      
      // Check if it's an IP whitelist error
      let userMessage = munoPayError.message;
      if (munoPayError.message.includes("IP address") && munoPayError.message.includes("not authorized")) {
        userMessage = "Payment gateway IP restriction. Please contact support to whitelist our server IP.";
      }
      
      // Update order to reflect gateway issue - PRESERVE THE REFERENCE
      await supabaseAdmin
        .from('orders')
        .update({
          payment_status: 'ip_whitelist_error',
          payment_gateway_response: {
            ...order.payment_gateway_response, // PRESERVE existing reference
            error: munoPayError.message,
            error_type: 'ip_whitelist',
            error_occurred_at: new Date().toISOString()
          }
        })
        .eq('id', order.id);

      // Return order created but payment failed
      return new Response(
        JSON.stringify({
          success: true,
          message: "Order created but IP whitelist error",
          data: {
            orderId: order.id,
            amount: amount,
            phone: formattedPhone,
            status: "order_created_ip_error",
            note: `Order saved. ${userMessage} IP: 198.54.120.100 needs whitelisting in MunoPay dashboard.`,
            webhookConfigured: true,
            webhookUrl: "https://vmvvvpqwwhybqzxewksd.supabase.co/functions/v1/munopay-webhook",
            reference: reference // Include reference in response
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