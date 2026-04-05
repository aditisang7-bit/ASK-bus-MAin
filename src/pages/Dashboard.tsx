import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePlan, PLAN_DISPLAY_NAMES } from "@/hooks/usePlan";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import UpgradeBanner from "@/components/UpgradeBanner";
import UpgradeModal from "@/components/UpgradeModal";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import {
  Clock, DollarSign, Calendar, CreditCard, Package, Users, UserCircle,
  ArrowRight, Image, Bell, MessageSquare, TrendingUp, Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const { user, isGuest } = useAuth();
  const {
    currentPlan, checkLimit, isTrial, isExpired,
    upgradeModalOpen, setUpgradeModalOpen, upgradeResource, upgradeCurrent, upgradeMax, openUpgradeModal,
  } = usePlan();

  const { data: bookingCount = 0 } = useQuery({
    queryKey: ["bookings-count"],
    queryFn: async () => {
      const { count } = await supabase.from("bookings").select("*", { count: "exact", head: true });
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: customerCount = 0 } = useQuery({
    queryKey: ["customers-count"],
    queryFn: async () => {
      const { count } = await supabase.from("customers").select("*", { count: "exact", head: true });
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: invoiceCount = 0 } = useQuery({
    queryKey: ["invoices-count"],
    queryFn: async () => {
      const { count } = await supabase.from("invoices").select("*", { count: "exact", head: true });
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: totalRevenue = 0 } = useQuery({
    queryKey: ["total-revenue"],
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("total").eq("status", "paid");
      return data?.reduce((sum, inv) => sum + Number(inv.total), 0) || 0;
    },
    enabled: !!user,
  });

  const { data: itemCount = 0 } = useQuery({
    queryKey: ["inventory-count"],
    queryFn: async () => {
      const { count } = await supabase.from("inventory").select("*", { count: "exact", head: true });
      return count || 0;
    },
    enabled: !!user,
  });

  const bookingCheck = checkLimit("bookings");
  const showBookingWarning = bookingCheck.max !== Infinity && bookingCheck.max > 0 && bookingCheck.current >= bookingCheck.max * 0.8;

  const stats = [
    { label: "Revenue", value: isGuest ? "₹--" : `₹${totalRevenue.toLocaleString("en-IN")}`, icon: TrendingUp, color: "text-accent" },
    { label: "Bookings", value: isGuest ? "--" : bookingCount, icon: Clock, color: "text-primary" },
    { label: "Invoices", value: isGuest ? "--" : invoiceCount, icon: DollarSign, color: "text-accent" },
    { label: "Customers", value: isGuest ? "--" : customerCount, icon: UserCircle, color: "text-primary" },
  ];

  const quickActions = [
    { title: "Bookings", desc: "Manage appointments", icon: Calendar, color: "text-accent", path: "/bookings" },
    { title: "Billing", desc: "Invoices & subscription", icon: CreditCard, color: "text-primary", path: "/billing" },
    { title: "Inventory", desc: "Track products", icon: Package, color: "text-accent", path: "/inventory" },
    { title: "CRM", desc: "Customer management", icon: UserCircle, color: "text-primary", path: "/crm" },
    { title: "Team", desc: "Manage employees", icon: Users, color: "text-accent", path: "/team" },
    { title: "Marketing", desc: "AI banners & campaigns", icon: Image, color: "text-primary", path: "/marketing" },
    { title: "WhatsApp", desc: "Send messages", icon: MessageSquare, color: "text-accent", path: "/whatsapp" },
    { title: "Reminders", desc: "Automated alerts", icon: Bell, color: "text-primary", path: "/reminders" },
  ];

  const usageMetrics = [
    { label: "Bookings", resource: "bookings" as const },
    { label: "Customers", resource: "customers" as const },
    { label: "WhatsApp", resource: "whatsapp_messages" as const },
    { label: "Emails", resource: "emails" as const },
    { label: "AI Usage", resource: "ai_usage" as const },
  ];

  return (
    <DashboardLayout
      title="Command Center"
      subtitle={isGuest ? "Guest Mode — limited access" : `Welcome back${user?.email ? `, ${user.email}` : ""}`}
    >
      {/* Plan status bar */}
      {!isGuest && (
        <div className="glass-card rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="w-5 h-5 text-accent" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {PLAN_DISPLAY_NAMES[currentPlan]} Plan
                {isTrial && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">Trial</span>}
                {isExpired && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">Expired</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                {currentPlan === "free" ? "Upgrade to unlock all features" : "Manage your subscription in Billing"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {currentPlan === "free" && (
              <Button size="sm" onClick={() => openUpgradeModal()} className="hero-gradient text-primary-foreground font-semibold">
                <Crown className="w-3 h-3 mr-1" /> Upgrade Plan
              </Button>
            )}
            <Link to="/billing">
              <Button size="sm" className={currentPlan !== "free" ? "hero-gradient text-primary-foreground font-semibold" : "bg-secondary text-foreground"}>
                {currentPlan === "free" ? "View Plans" : "Manage Plan"}
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Usage warning */}
      {showBookingWarning && (
        <UpgradeBanner resource="Bookings" current={bookingCheck.current} max={bookingCheck.max} plan={currentPlan} />
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">{stat.label}</span>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div className="text-2xl font-bold text-foreground">{stat.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Usage Progress Bars */}
      {!isGuest && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Usage This Month</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {usageMetrics.map((metric) => {
              const { current, max } = checkLimit(metric.resource);
              const isUnlimited = max === Infinity || (typeof max === "boolean");
              const percentage = isUnlimited ? 0 : max > 0 ? Math.min((current / max) * 100, 100) : 0;
              const isWarning = !isUnlimited && max > 0 && percentage >= 80;
              const isBlocked = !isUnlimited && max > 0 && percentage >= 100;
              return (
                <div key={metric.resource} className="glass-card rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">{metric.label}</span>
                    <span className={`text-xs font-bold ${isBlocked ? "text-destructive" : isWarning ? "text-yellow-500" : "text-foreground"}`}>
                      {current}/{isUnlimited ? "∞" : max}
                    </span>
                  </div>
                  {!isUnlimited && max > 0 && (
                    <Progress
                      value={percentage}
                      className={`h-2 ${isBlocked ? "[&>div]:bg-destructive" : isWarning ? "[&>div]:bg-yellow-500" : ""}`}
                    />
                  )}
                  {isUnlimited && <p className="text-[10px] text-accent">Unlimited</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Quick Actions</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.06 }}
          >
            <Link to={card.path} className="glass-card rounded-xl p-5 block hover:bg-card/80 transition-colors group">
              <div className="flex items-center justify-between mb-3">
                <card.icon className={`w-5 h-5 ${card.color}`} />
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h4 className="text-sm font-semibold text-foreground mb-1">{card.title}</h4>
              <p className="text-xs text-muted-foreground">{card.desc}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        resource={upgradeResource}
        current={upgradeCurrent}
        max={upgradeMax}
        currentPlan={currentPlan}
      />
    </DashboardLayout>
  );
};

export default Dashboard;
