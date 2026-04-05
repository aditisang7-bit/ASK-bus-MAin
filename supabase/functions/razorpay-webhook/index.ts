import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-razorpay-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function verifyWebhookSignature(body: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex === signature;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!RAZORPAY_KEY_SECRET) {
      console.error("Webhook: RAZORPAY_KEY_SECRET not configured");
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";

    if (!signature) {
      console.error("Webhook: Missing signature header");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isValid = await verifyWebhookSignature(rawBody, signature, RAZORPAY_KEY_SECRET);
    if (!isValid) {
      console.error("Webhook: Invalid signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const entity = payload.payload?.payment?.entity;

    console.log("Webhook event:", event, "payment_id:", entity?.id);

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    switch (event) {
      case "payment.captured": {
        if (!entity?.order_id) break;

        // Update payments table
        await serviceClient
          .from("payments")
          .update({
            razorpay_payment_id: entity.id,
            status: "captured",
            method: entity.method || "razorpay",
          })
          .eq("razorpay_order_id", entity.order_id);

        // Mark related invoice as paid
        const { data: payment } = await serviceClient
          .from("payments")
          .select("invoice_id")
          .eq("razorpay_order_id", entity.order_id)
          .single();

        if (payment?.invoice_id) {
          await serviceClient
            .from("invoices")
            .update({ status: "paid", payment_method: entity.method || "razorpay" })
            .eq("id", payment.invoice_id);
        }

        // Log it
        await serviceClient.from("payment_logs").insert({
          user_id: entity.notes?.user_id || "00000000-0000-0000-0000-000000000000",
          amount: (entity.amount || 0) / 100,
          type: entity.notes?.type || "invoice",
          status: "captured",
          razorpay_payment_id: entity.id,
          razorpay_order_id: entity.order_id,
        });

        console.log("Webhook: payment.captured processed for order", entity.order_id);
        break;
      }

      case "payment.failed": {
        if (!entity?.order_id) break;

        await serviceClient
          .from("payments")
          .update({ status: "failed" })
          .eq("razorpay_order_id", entity.order_id);

        await serviceClient.from("payment_logs").insert({
          user_id: entity.notes?.user_id || "00000000-0000-0000-0000-000000000000",
          amount: (entity.amount || 0) / 100,
          type: entity.notes?.type || "invoice",
          status: "failed",
          razorpay_payment_id: entity.id,
          razorpay_order_id: entity.order_id,
        });

        console.log("Webhook: payment.failed processed for order", entity.order_id);
        break;
      }

      case "subscription.charged": {
        const subEntity = payload.payload?.subscription?.entity;
        if (!subEntity) break;

        const userId = subEntity.notes?.user_id;
        if (!userId) break;

        // Extend subscription expiry
        const now = new Date();
        const expiresAt = new Date(now);
        if (subEntity.billing_cycle === "yearly") {
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        } else {
          expiresAt.setMonth(expiresAt.getMonth() + 1);
        }

        await serviceClient
          .from("subscriptions")
          .update({
            status: "active",
            starts_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
          })
          .eq("user_id", userId);

        console.log("Webhook: subscription.charged - renewed for user", userId);
        break;
      }

      case "subscription.halted":
      case "subscription.cancelled": {
        const subEntity2 = payload.payload?.subscription?.entity;
        const userId2 = subEntity2?.notes?.user_id;
        if (!userId2) break;

        await serviceClient
          .from("subscriptions")
          .update({ status: "expired", plan: "free", amount: 0 })
          .eq("user_id", userId2);

        console.log("Webhook:", event, "- deactivated for user", userId2);
        break;
      }

      default:
        console.log("Webhook: unhandled event", event);
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
