import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for cross-user queries
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: usersData } = await serviceClient.auth.admin.listUsers({ perPage: 500 });
    const totalUsers = usersData?.users?.length || 0;

    const { data: subs } = await serviceClient
      .from("subscriptions")
      .select("plan, status, amount, user_id, billing_cycle, expires_at");

    const activeSubs = subs?.filter((s) => s.status === "active").length || 0;
    const trialUsers = subs?.filter((s) => s.status === "trial").length || 0;
    const totalRevenue = subs
      ?.filter((s) => s.status === "active")
      .reduce((sum, s) => sum + Number(s.amount), 0) || 0;

    const planDistribution: Record<string, number> = {};
    subs?.forEach((s) => {
      planDistribution[s.plan] = (planDistribution[s.plan] || 0) + 1;
    });

    // Build user list with subscription info
    const subsByUser = new Map(subs?.map((s) => [s.user_id, s]) || []);
    const userList = (usersData?.users || []).map((u: any) => {
      const sub = subsByUser.get(u.id);
      return {
        id: u.id,
        email: u.email || "—",
        created_at: u.created_at,
        plan: sub?.plan || "free",
        status: sub?.status || "none",
        amount: sub ? Number(sub.amount) : 0,
        billing_cycle: sub?.billing_cycle || "—",
        expires_at: sub?.expires_at || null,
      };
    });

    return new Response(
      JSON.stringify({
        total_users: totalUsers,
        active_subs: activeSubs,
        trial_users: trialUsers,
        total_revenue: totalRevenue,
        plan_distribution: planDistribution,
        users: userList,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Admin stats error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
