import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePlan } from "@/hooks/usePlan";
import TrialBanner from "@/components/TrialBanner";
import UpgradeModal from "@/components/UpgradeModal";
import SignupModal from "@/components/SignupModal";
import {
  LayoutDashboard, Calendar, CreditCard, Package, Users, UserCircle,
  Image, Bell, ChevronLeft, ChevronRight, LogOut, MessageSquare, Crown, Settings, Shield, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Calendar, label: "Bookings", path: "/bookings" },
  { icon: CreditCard, label: "Billing", path: "/billing" },
  { icon: Package, label: "Inventory", path: "/inventory" },
  { icon: UserCircle, label: "CRM", path: "/crm" },
  { icon: Users, label: "Team", path: "/team" },
  { icon: Image, label: "Marketing", path: "/marketing" },
  { icon: Bell, label: "Reminders", path: "/reminders" },
  { icon: MessageSquare, label: "WhatsApp", path: "/whatsapp" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

const DashboardLayout = ({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { signOut, isGuest, user } = useAuth();
  const {
    isTrial, isExpired, trialDaysRemaining, currentPlan,
    upgradeModalOpen, setUpgradeModalOpen, upgradeResource, upgradeCurrent, upgradeMax,
    signupModalOpen, setSignupModalOpen, guestUsageCount,
    limits, openUpgradeModal,
  } = usePlan();

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id).eq("role", "admin").maybeSingle();
      return !!data;
    },
    enabled: !!user && !isGuest,
  });

  const allNavItems = isAdmin
    ? [...navItems, { icon: Shield, label: "Admin", path: "/admin" }]
    : navItems;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className={`${collapsed ? "w-16" : "w-60"} bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 shrink-0 hidden md:flex`}>
        <Link to="/" className="h-16 flex items-center px-4 gap-2 border-b border-sidebar-border">
          <img src={logo} alt="ASK Business Manager" className="w-8 h-8 object-contain shrink-0" />
          {!collapsed && <span className="font-bold text-sm text-foreground tracking-tight-custom">ASK Business Manager</span>}
        </Link>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto w-full">
          {allNavItems.map((item) => {
            const isLocked = (() => {
              if (item.path === "/inventory") return !limits.inventory;
              if (item.path === "/crm") return !limits.crm;
              if (item.path === "/marketing") return !limits.marketing;
              if (item.path === "/reminders") return !limits.reminders;
              if (item.path === "/team") return limits.team === 0;
              return false;
            })();

            if (isLocked) {
              return (
                <button
                  key={item.path}
                  onClick={(e) => {
                    e.preventDefault();
                    if (isGuest) setSignupModalOpen(true);
                    else openUpgradeModal(item.label);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors text-muted-foreground hover:bg-sidebar-accent/50 group text-left"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4 shrink-0 opacity-50" />
                    {!collapsed && <span className="opacity-70">{item.label}</span>}
                  </div>
                  {!collapsed && <Lock className="w-3 h-3 text-muted-foreground opacity-50 relative top-[1px]" />}
                  {collapsed && <Lock className="w-3 h-3 absolute ml-5 bg-background rounded-full text-muted-foreground" />}
                </button>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  location.pathname === item.path
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-2 border-t border-sidebar-border space-y-1">
          {isGuest && (
            <a href="/#pricing" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-accent hover:bg-sidebar-accent/50 transition-colors">
              <Crown className="w-4 h-4 shrink-0" />
              {!collapsed && "Upgrade"}
            </a>
          )}
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && (isGuest ? "Exit Guest" : "Sign Out")}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Mobile nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border flex justify-around py-2">
        {navItems.slice(0, 5).map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] ${
              location.pathname === item.path ? "text-accent" : "text-sidebar-foreground"
            }`}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </Link>
        ))}
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <header className="h-16 border-b border-border/50 flex flex-col md:flex-row items-start md:items-center justify-between px-6 md:px-8 bg-background/80 backdrop-blur-xl sticky top-0 z-10 py-2 md:py-0 gap-2 md:gap-0">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground tracking-tight-custom">{title}</h1>
              <div className="hidden md:flex px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20 text-[10px] font-semibold text-accent capitalize">
                {currentPlan} Plan
              </div>
            </div>
            {subtitle ? (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            ) : isGuest ? (
              <p className="text-[10px] text-amber-600 font-medium hidden md:block">Guest Mode — progress may not be saved</p>
            ) : null}
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
            {isGuest ? (
               <>
                <p className="text-[10px] text-amber-600 font-medium md:hidden flex-1">Progress not saved</p>
                <Link to="/auth">
                  <Button size="sm" className="hero-gradient text-primary-foreground text-xs font-semibold">
                    <Crown className="w-3 h-3 mr-1" /> Sign Up
                  </Button>
                </Link>
              </>
            ) : currentPlan !== "pro" ? (
              <Button size="sm" onClick={() => setUpgradeModalOpen(true)} className="hero-gradient text-primary-foreground text-xs font-semibold ml-auto">
                <Crown className="w-3 h-3 mr-1" /> Upgrade Plan 🚀
              </Button>
            ) : null}
          </div>
        </header>
        <div className="p-4 md:p-8">
          {/* Trial Banner */}
          {!isGuest && isTrial && (
            <TrialBanner daysRemaining={trialDaysRemaining} isExpired={isExpired} />
          )}
          {!isGuest && !isTrial && isExpired && (
            <TrialBanner daysRemaining={0} isExpired={true} />
          )}
          {children}
        </div>
      </main>

      {/* Global Upgrade Modal */}
      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        resource={upgradeResource}
        current={upgradeCurrent}
        max={upgradeMax}
        currentPlan={currentPlan}
      />
      
      {/* Guest Signup Modal */}
      <SignupModal
        open={signupModalOpen}
        onOpenChange={setSignupModalOpen}
        guestUsageCount={guestUsageCount}
      />
    </div>
  );
};

export default DashboardLayout;
