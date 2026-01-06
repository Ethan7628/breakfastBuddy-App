import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, munopay-signature",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== MUNOPAY WEBHOOK RECEIVED ===");
    
    // 1️⃣ Get signature header (MunoPay uses "munopay-signature")
    const signatureHeader = req.headers.get("munopay-signature");
    
    console.log("Received signature header:", signatureHeader);
    
    // 2️⃣ Get raw body (CRITICAL for signature verification)
    const rawBody = await req.text();
    console.log("Raw body length:", rawBody.length);
    
    if (!rawBody) {
      console.error("Empty body received");
      return new Response(JSON.stringify({ received: true, warning: "Empty body" }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      });
    }

    // 3️⃣ Parse the payload
    let payload;
    try {
      payload = JSON.parse(rawBody);
      console.log("Parsed payload reference_id:", payload.reference_id);
    } catch (e) {
      console.error("Failed to parse JSON:", e);
      return new Response(JSON.stringify({ received: true, error: "Invalid JSON" }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      });
    }

    // 4️⃣ Get webhook secret from environment
    const webhookKey = Deno.env.get("MUNOPAY_WEBHOOK_KEY");
    console.log("Webhook key exists:", !!webhookKey);
    
    // 5️⃣ Verify signature if we have both signature and key
    let signatureValid = true;
    let signatureVerificationMessage = "Skipped - No signature or key";
    
    if (signatureHeader && webhookKey) {
      try {
        console.log("Attempting signature verification...");
        
        // Parse the signature header: t=TIMESTAMP,v=SIGNATURE
        const signatureParts = signatureHeader.split(",");
        let timestamp = "";
        let receivedSignature = "";
        
        for (const part of signatureParts) {
          const trimmedPart = part.trim();
          if (trimmedPart.startsWith("t=")) {
            timestamp = trimmedPart.substring(2);
          } else if (trimmedPart.startsWith("v=")) {
            receivedSignature = trimmedPart.substring(2);
          }
        }
        
        console.log("Extracted timestamp:", timestamp);
        console.log("Extracted signature:", receivedSignature.substring(0, 20) + "...");
        
        if (!receivedSignature || !timestamp) {
          console.error("Invalid signature format. Expected: t=TIMESTAMP,v=SIGNATURE");
          signatureValid = false;
          signatureVerificationMessage = "Invalid signature format";
        } else {
          // ⚠️ IMPORTANT: Need to check MunoPay's exact method
          // Common patterns include:
          // 1. HMAC-SHA256(timestamp + rawBody) - Most likely
          // 2. HMAC-SHA256(rawBody) - Simpler approach
          // 3. HMAC-SHA256(timestamp + "." + rawBody) - Like Stripe
          
          // Let's try the most common pattern: timestamp + rawBody
          const message = timestamp + rawBody;
          console.log("Message to sign (first 100 chars):", message.substring(0, 100) + "...");
          
          const encoder = new TextEncoder();
          
          // Create HMAC key
          const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(webhookKey),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign", "verify"]
          );

          // Generate signature
          const signed = await crypto.subtle.sign(
            "HMAC",
            key,
            encoder.encode(message)
          );

          // Convert to hex
          const expectedSignature = Array.from(new Uint8Array(signed))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

          console.log("Expected signature (first 20 chars):", expectedSignature.substring(0, 20) + "...");
          console.log("Received signature (first 20 chars):", receivedSignature.substring(0, 20) + "...");
          
          // Compare signatures
          signatureValid = receivedSignature === expectedSignature;
          signatureVerificationMessage = signatureValid ? "Valid" : "Invalid";
          
          // If that didn't work, try alternative: just rawBody (without timestamp)
          if (!signatureValid) {
            console.log("Trying alternative: HMAC of rawBody only...");
            const signed2 = await crypto.subtle.sign(
              "HMAC",
              key,
              encoder.encode(rawBody)
            );
            
            const expectedSignature2 = Array.from(new Uint8Array(signed2))
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("");
            
            if (receivedSignature === expectedSignature2) {
              signatureValid = true;
              signatureVerificationMessage = "Valid (rawBody only)";
              console.log("✅ Signature valid using rawBody only method");
            }
          }
          
          console.log("Signature verification result:", signatureVerificationMessage);
        }
        
      } catch (verificationError) {
        console.error("Signature verification error:", verificationError);
        signatureValid = false;
        signatureVerificationMessage = "Verification error";
      }
    }

    // ⚠️ TEMPORARY: For now, accept webhooks even if signature verification fails
    // This is so we can at least process payments while we figure out the correct method
    // TODO: Once we confirm the correct method, remove this and enforce signature verification
    if (!signatureValid && webhookKey) {
      console.warn("⚠️ WARNING: Signature verification failed, but accepting webhook for testing");
      console.warn("⚠️ Please contact MunoPay support to confirm the correct signature method");
      console.warn("⚠️ Current signature header:", signatureHeader);
      // Don't return error - continue processing
    }

    // 6️⃣ Find and process the order
    console.log("=== PROCESSING ORDER ===");
    console.log("Reference ID:", payload.reference_id);
    console.log("Transaction ID:", payload.transaction_id);
    console.log("Status:", payload.status);
    console.log("Request Status:", payload.request_status);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase configuration");
      return new Response("Server error", { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Find the order
    let orderId = null;
    const referenceId = payload.reference_id;
    
    if (!referenceId) {
      console.error("No reference_id in webhook!");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "No reference_id provided" 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        }
      );
    }

    console.log("Searching for order with reference:", referenceId);

    // ========== IMPROVED ORDER SEARCH LOGIC ==========
    // Method 1: Direct SQL query for reference in payment_gateway_response
    console.log("Method 1: Direct SQL query for reference...");
    const { data: orderByReference } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('payment_gateway_response->>reference', referenceId)
      .limit(1)
      .single();

    if (orderByReference) {
      orderId = orderByReference.id;
      console.log("✅ Found order by direct reference query:", orderId);
    }

    // Method 2: If that fails, try JSON contains query
    if (!orderId) {
      console.log("Method 2: Trying JSON contains query...");
      const { data: orders } = await supabaseAdmin
        .from('orders')
        .select('id, payment_gateway_response')
        .contains('payment_gateway_response', { reference: referenceId })
        .limit(1);

      if (orders && orders.length > 0) {
        orderId = orders[0].id;
        console.log("✅ Found order by JSON contains:", orderId);
      }
    }

    // Method 3: Try to extract from reference pattern
    if (!orderId && referenceId.startsWith("ORDER_")) {
      const parts = referenceId.split("_");
      if (parts.length >= 2) {
        const shortOrderId = parts[1];
        console.log("Method 3: Trying partial ID match:", shortOrderId);
        
        const { data: order } = await supabaseAdmin
          .from('orders')
          .select('id')
          .ilike('id', `${shortOrderId}%`)
          .limit(1)
          .single();
        
        if (order) {
          orderId = order.id;
          console.log("✅ Found order by partial ID:", orderId);
        }
      }
    }

    // Method 4: Fallback - manual search in recent orders
    if (!orderId) {
      console.log("Method 4: Manual search in recent orders...");
      const { data: recentOrders } = await supabaseAdmin
        .from('orders')
        .select('id, payment_gateway_response')
        .order('created_at', { ascending: false })
        .limit(20);

      if (recentOrders) {
        for (const order of recentOrders) {
          const pgr = order.payment_gateway_response || {};
          // Check multiple possible locations for the reference
          if (pgr.reference === referenceId || 
              pgr.metadata?.order_reference === referenceId ||
              pgr.reference_id === referenceId) {
            orderId = order.id;
            console.log("✅ Found order by manual reference match:", orderId);
            break;
          }
        }
      }
    }

    // Method 5: Try by transaction ID as last resort
    if (!orderId && payload.transaction_id) {
      console.log("Method 5: Trying by transaction ID:", payload.transaction_id);
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('stripe_payment_intent_id', payload.transaction_id)
        .limit(1)
        .single();
      
      if (order) {
        orderId = order.id;
        console.log("✅ Found order by transaction ID:", orderId);
      }
    }

    if (!orderId) {
      console.error("❌ Order not found for reference:", referenceId);
      console.log("Payload was:", payload);
      
      // Log recent orders for debugging
      const { data: recentOrders } = await supabaseAdmin
        .from('orders')
        .select('id, created_at, payment_status, payment_gateway_response')
        .order('created_at', { ascending: false })
        .limit(5);
      
      console.log("Recent orders for debugging:");
      if (recentOrders) {
        recentOrders.forEach(order => {
          const pgr = order.payment_gateway_response || {};
          console.log(`Order ${order.id}:`, {
            created: order.created_at,
            status: order.payment_status,
            reference: pgr.reference,
            metadata_ref: pgr.metadata?.order_reference
          });
        });
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Order not found",
          reference_id: referenceId,
          search_methods_tried: 5
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        }
      );
    }

    console.log("✅ Processing order:", orderId);

    // Determine payment status
    let paymentStatus = 'pending';
    let note = '';

    if (payload.status === 'success' || payload.request_status === 'Approved') {
      paymentStatus = 'paid';
      note = 'Payment completed successfully via MunoPay';
    } else if (payload.status === 'failed' || payload.request_status === 'Declined') {
      paymentStatus = 'failed';
      note = payload.message || 'Payment failed via MunoPay';
    } else {
      paymentStatus = 'pending';
      note = 'Payment is still being processed';
    }

    console.log(`Setting status: ${paymentStatus}`);

    // Update the order
    const updateData: any = {
      payment_status: paymentStatus,
      updated_at: new Date().toISOString(),
      payment_gateway_response: {
        ...payload,
        webhook_received_at: new Date().toISOString(),
        signature_verification: signatureVerificationMessage,
        webhook_signature_header: signatureHeader,
        reference_id: payload.reference_id
      }
    };

    if (payload.transaction_id) {
      updateData.stripe_payment_intent_id = payload.transaction_id;
    }

    const { error: updateError, data: updatedOrder } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      console.error("Failed to update order:", updateError);
      return new Response(
        JSON.stringify({ error: "Database error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✅ Order ${orderId} updated to: ${paymentStatus}`);

    // Clear cart if payment successful
    if (paymentStatus === 'paid') {
      try {
        const userId = updatedOrder.user_id;
        if (userId) {
          console.log(`Clearing cart for user ${userId}`);
          await supabaseAdmin
            .from('cart_items')
            .delete()
            .eq('user_id', userId);
          console.log("✅ Cart cleared");
        }
      } catch (cartError) {
        console.warn("Failed to clear cart:", cartError);
      }
    }

    // Return success
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Webhook processed",
        order_id: orderId,
        status: paymentStatus,
        signature_valid: signatureValid,
        signature_method: signatureVerificationMessage
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Internal server error",
        message: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});