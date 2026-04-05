import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function verifySignature(orderId: string, paymentId: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const data = encoder.encode(`${orderId}|${paymentId}`);
  const sig = await crypto.subtle.sign("HMAC", key, data);
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === signature;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, billing_cycle } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan) {
      return new Response(JSON.stringify({ error: "Missing payment details" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") || Deno.env.get("key_secret");
    if (!RAZORPAY_KEY_SECRET) {
      console.error("Razorpay secret not configured. Checked: RAZORPAY_KEY_SECRET, key_secret");
      return new Response(JSON.stringify({ error: "Razorpay secret not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isValid = await verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, RAZORPAY_KEY_SECRET);
    if (!isValid) {
      return new Response(JSON.stringify({ error: "Invalid payment signature", verified: false }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const PLAN_PRICES: Record<string, Record<string, number>> = {
      starter: { monthly: 299, yearly: 2999 },
      growth: { monthly: 999, yearly: 9999 },
      pro: { monthly: 2499, yearly: 24999 },
    };

    const cycle = billing_cycle === "yearly" ? "yearly" : "monthly";
    const amount = PLAN_PRICES[plan]?.[cycle] || 0;
    const now = new Date();
    const expiresAt = new Date(now);
    if (cycle === "yearly") {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await serviceClient.from("subscriptions").upsert({
      user_id: userId,
      plan,
      billing_cycle: cycle,
      amount,
      starts_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      razorpay_subscription_id: razorpay_payment_id,
      status: "active",
    }, { onConflict: "user_id" });

    return new Response(
      JSON.stringify({ verified: true, plan, expires_at: expiresAt.toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error activating subscription:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg, verified: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
