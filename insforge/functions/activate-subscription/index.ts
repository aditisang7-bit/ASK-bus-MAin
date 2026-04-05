import { createClient } from "https://esm.sh/@insforge/sdk@1.2.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, billing_cycle } = await req.json();
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan) {
      return new Response(JSON.stringify({ error: "Missing payment details" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!RAZORPAY_KEY_SECRET) throw new Error("Razorpay secret not configured");

    const isValid = await verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, RAZORPAY_KEY_SECRET);
    if (!isValid) {
      return new Response(JSON.stringify({ error: "Invalid payment signature", verified: false }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Update user profile with new plan
    const { error: updateError } = await insforge.database
      .from("user_profiles")
      .update([{ subscription_plan: plan }])
      .eq("user_id", user.id);

    if (updateError) throw new Error(`Profile update failed: ${updateError.message}`);

    // Log payment
    await insforge.database
      .from("payments")
      .insert([{
        user_id: user.id,
        amount: 0, // Should calculate or get from Razorpay
        method: "razorpay",
        status: "paid"
      }]);

    return new Response(JSON.stringify({ verified: true, plan }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message, verified: false }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
