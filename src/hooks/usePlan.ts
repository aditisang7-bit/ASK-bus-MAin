import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type PlanName = "guest" | "free" | "starter" | "growth" | "pro";

type PlanLimits = {
  bookings: number;
  customers: number;
  team: number;
  ai_usage: number;
  ai_calls: number;
  whatsapp_messages: number;
  emails: number;
  invoices: number;
  inventory: boolean;
  crm: boolean;
  marketing: boolean;
  whatsapp: boolean;
  reminders: boolean;
  guest_actions?: number;
};

const PLAN_LIMITS: Record<PlanName, PlanLimits> = {
  guest: {
    bookings: 2, customers: 2, team: 0, ai_usage: 0, ai_calls: 0,
    whatsapp_messages: 2, emails: 0, invoices: 1,
    inventory: false, crm: false, marketing: false, whatsapp: false, reminders: false,
    guest_actions: 2,
  },
  free: {
    bookings: 3, customers: Infinity, team: 0, ai_usage: 0, ai_calls: 0,
    whatsapp_messages: Infinity, emails: 0, invoices: 3,
    inventory: false, crm: false, marketing: false, whatsapp: true, reminders: false,
  },
  starter: {
    bookings: 200, customers: 200, team: 0, ai_usage: 0, ai_calls: 0,
    whatsapp_messages: Infinity, emails: 0, invoices: 200,
    inventory: true, crm: true, marketing: false, whatsapp: true, reminders: true,
  },
  growth: {
    bookings: 1000, customers: 1000, team: 0, ai_usage: 0, ai_calls: 0,
    whatsapp_messages: Infinity, emails: 0, invoices: 1000,
    inventory: true, crm: true, marketing: true, whatsapp: true, reminders: true,
  },
  pro: {
    bookings: Infinity, customers: Infinity, team: 10, ai_usage: Infinity, ai_calls: Infinity,
    whatsapp_messages: Infinity, emails: Infinity, invoices: Infinity,
    inventory: true, crm: true, marketing: true, whatsapp: true, reminders: true,
  },
};

export const PLAN_PRICES: Record<string, Record<string, number>> = {
  starter: { monthly: 699, yearly: 6990 },
  growth: { monthly: 999, yearly: 9990 },
  pro: { monthly: 2999, yearly: 29990 },
};

export const PLAN_DISPLAY_NAMES: Record<PlanName, string> = {
  guest: "Guest", free: "Free", starter: "Starter", growth: "Growth", pro: "Pro",
};

export type UsageStatus = "normal" | "warning" | "blocked";

export function usePlan() {
  const { user, isGuest } = useAuth();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const [upgradeResource, setUpgradeResource] = useState<string | undefined>();
  const [upgradeCurrent, setUpgradeCurrent] = useState<number | undefined>();
  const [upgradeMax, setUpgradeMax] = useState<number | undefined>();

  // Use state to trigger re-renders for guest usage changes
  const [guestUsageCount, setGuestUsageCount] = useState<number>(0);

  useEffect(() => {
    if (isGuest) {
      const stored = localStorage.getItem("guest_usage_count");
      if (stored) setGuestUsageCount(parseInt(stored, 10));
    }
  }, [isGuest]);

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !isGuest,
  });

  const { data: usageData, refetch: refetchUsage } = useQuery({
    queryKey: ["usage", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("usage_tracking")
        .select("*")
        .eq("user_id", user!.id)
        .gte("period_start", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());
      return data || [];
    },
    enabled: !!user && !isGuest,
  });

  const currentPlan: PlanName = isGuest
    ? "guest"
    : (subscription?.plan as PlanName) || "free";

  const isExpired = subscription
    ? new Date(subscription.expires_at) < new Date()
    : false;

  const isTrial = subscription?.status === "trial";

  const trialDaysRemaining = (() => {
    if (!isTrial || !subscription?.expires_at) return 0;
    const diff = new Date(subscription.expires_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  const effectivePlan: PlanName = isExpired ? "free" : currentPlan;
  const limits = PLAN_LIMITS[effectivePlan];

  const getUsage = (resource: string): number => {
    if (isGuest) return guestUsageCount;
    if (!usageData) return 0;
    const entry = usageData.find((u: any) => u.resource === resource);
    return entry?.count || 0;
  };

  const checkLimit = (resource: keyof PlanLimits): { allowed: boolean; current: number; max: number } => {
    const max = isGuest ? (limits.guest_actions || 2) : limits[resource];
    
    if (typeof max === "boolean") {
      return { allowed: max, current: 0, max: max ? 1 : 0 };
    }
    const current = getUsage(resource);
    return { allowed: current < (max as number), current, max: max as number };
  };

  const getUsageStatus = (resource: keyof PlanLimits): UsageStatus => {
    const max = isGuest ? (limits.guest_actions || 2) : limits[resource];
    if (typeof max === "boolean") return max ? "normal" : "blocked";
    if (max === Infinity) return "normal";
    const current = getUsage(resource as string);
    if (current >= (max as number)) return "blocked";
    if (current >= (max as number) * 0.7) return "warning"; // User requested 70%
    return "normal";
  };

  const openUpgradeModal = useCallback((resource?: string, current?: number, max?: number) => {
    setUpgradeResource(resource);
    setUpgradeCurrent(current);
    setUpgradeMax(max);
    if (isGuest) {
      setSignupModalOpen(true);
    } else {
      setUpgradeModalOpen(true);
    }
  }, [isGuest]);

  const enforceLimit = (resource: keyof PlanLimits, actionLabel?: string): boolean => {
    const { allowed, current, max } = checkLimit(resource);
    if (!allowed) {
      const label = actionLabel || resource;
      toast.error("Limit reached. Upgrade to continue.", {
        description: `You've used ${current}/${max} ${label}.`
      });
      openUpgradeModal(String(label), current, max);
      return false;
    }
    return true;
  };

  // Reusable function as requested by the user: checkAccess(feature, userPlan, usageCount)
  // This is fundamentally similar to enforceLimit, but we'll export it wrapped for global convenience.
  const checkAccess = (feature: keyof PlanLimits) => {
      return enforceLimit(feature);
  };

  const incrementUsage = async (resource: string) => {
    if (isGuest) {
      const newCount = guestUsageCount + 1;
      setGuestUsageCount(newCount);
      localStorage.setItem("guest_usage_count", newCount.toString());
      return;
    }
    if (!user) return;
    await supabase.rpc("increment_usage", {
      _user_id: user.id,
      _resource: resource,
    });
    refetchUsage();
  };

  return {
    currentPlan: effectivePlan,
    subscription,
    isExpired,
    isTrial,
    trialDaysRemaining,
    limits,
    subLoading,
    getUsage,
    checkLimit,
    getUsageStatus,
    enforceLimit,
    checkAccess,     // Exposing new requested method name
    incrementUsage,
    isGuest,
    guestUsageCount, // Exposed for UI
    upgradeModalOpen,
    setUpgradeModalOpen,
    signupModalOpen, // Exposed for Guest Modal
    setSignupModalOpen, // Exposed for Guest Modal
    upgradeResource,
    upgradeCurrent,
    upgradeMax,
    openUpgradeModal,
  };
}
