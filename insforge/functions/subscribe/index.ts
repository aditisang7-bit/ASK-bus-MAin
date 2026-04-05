import { createClient } from "https://esm.sh/@insforge/sdk@1.2.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_PRICES: Record<string, Record<string, number>> = {
  starter: { monthly: 299, yearly: 2999 },
  growth: { monthly: 999, yearly: 9999 },
  pro: { monthly: 2499, yearly: 24999 },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const insforge = createClient({
      baseUrl: Deno.env.get("INSFORGE_URL")!,
      anonKey: Deno.env.get("INSFORGE_ANON_KEY")!,
    });

    const { data: { user }, error: userError } = await insforge.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { plan, billing_cycle } = await req.json();
    if (!plan || !PLAN_PRICES[plan]) {
      return new Response(JSON.stringify({ error: "Invalid plan" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const cycle = billing_cycle === "yearly" ? "yearly" : "monthly";
    const amount = PLAN_PRICES[plan][cycle];

    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return new Response(JSON.stringify({ error: "Razorpay keys not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        currency: "INR",
        receipt: `sub_${user.id.slice(0, 8)}_${Date.now()}`,
        notes: { user_id: user.id, plan, billing_cycle: cycle },
      }),
    });

    if (!orderRes.ok) throw new Error(`Razorpay error: ${await orderRes.text()}`);
    const order = await orderRes.json();

    return new Response(JSON.stringify({ order_id: order.id, amount: order.amount, currency: order.currency, key_id: RAZORPAY_KEY_ID, plan, billing_cycle: cycle }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
