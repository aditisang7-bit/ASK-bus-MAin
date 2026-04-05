/**
 * Hook for checking plan access, tracking usage, and managing paywall logic
 */

import { useAuth } from "./useAuth";
import { useCallback, useState, useEffect } from "react";
import type { UserPlan, FeatureType } from "@/lib/plans";
import { PLANS, getLimit } from "@/lib/plans";
import { supabase } from "@/integrations/supabase/client";

interface UsageData {
  bookings: number;
  customers: number;
  whatsapp: number;
  emails: number;
  invoices: number;
  team: number;
}

interface UsageLimits {
  remaining: number;
  used: number;
  limit: number;
  percentage: number;
  isLimited: boolean;
}

export interface PlanAccessResult {
  hasAccess: boolean;
  reason?: string;
  usage?: UsageLimits;
  requiresUpgrade: boolean;
  currentPlan: UserPlan;
}

export const usePlanAccess = () => {
  const { user, isGuest } = useAuth();
  const [userPlan, setUserPlan] = useState<UserPlan>("free");
  const [usage, setUsage] = useState<UsageData>({
    bookings: 0,
    customers: 0,
    whatsapp: 0,
    emails: 0,
    invoices: 0,
    team: 0,
  });
  const [loading, setLoading] = useState(true);
  const [guestActionCount, setGuestActionCount] = useState(0);

  // Load user plan from database
  useEffect(() => {
    if (isGuest) {
      setUserPlan("guest");
      setLoading(false);
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }

    const loadUserPlan = async () => {
      try {
        const { data, error } = await supabase
          .from("user_subscriptions")
          .select("plan, usage_data")
          .eq("user_id", user.id)
          .maybeSingle();

        if (data) {
          setUserPlan((data.plan as UserPlan) || "free");
          setUsage(data.usage_data || {});
        }
      } catch (err) {
        console.error("Error loading user plan:", err);
      } finally {
        setLoading(false);
      }
    };

    loadUserPlan();
  }, [user, isGuest]);

  /**
   * Check if user can access a feature
   */
  const checkAccess = useCallback(
    (featureType: FeatureType): PlanAccessResult => {
      // Guest mode: limited actions
      if (isGuest) {
        if (guestActionCount >= 2) {
          return {
            hasAccess: false,
            requiresUpgrade: true,
            reason: "You've reached your free demo limit. Sign up to continue.",
            currentPlan: "guest",
          };
        }
        return {
          hasAccess: true,
          requiresUpgrade: false,
          currentPlan: "guest",
        };
      }

      const plan = PLANS[userPlan];
      const limit = getLimit(plan, featureType);
      const used = usage[featureType as keyof UsageData] || 0;
      const remaining = Math.max(0, limit - used);
      const percentage = limit > 0 ? (used / limit) * 100 : 0;

      const isAtLimit = used >= limit;
      const hasAccess = !isAtLimit;

      return {
        hasAccess,
        requiresUpgrade: isAtLimit,
        currentPlan: userPlan,
        reason: isAtLimit
          ? `You've reached your ${featureType} limit. Upgrade your plan to continue.`
          : undefined,
        usage: {
          remaining,
          used,
          limit,
          percentage,
          isLimited: percentage >= 70, // Flag when at 70% usage
        },
      };
    },
    [userPlan, usage, isGuest, guestActionCount]
  );

  /**
   * Increment usage counter
   */
  const recordUsage = useCallback(
    async (featureType: FeatureType, count: number = 1) => {
      if (isGuest) {
        setGuestActionCount((prev) => prev + count);
        return;
      }

      if (!user) return;

      // Update local state
      setUsage((prev) => ({
        ...prev,
        [featureType]: (prev[featureType as keyof UsageData] || 0) + count,
      }));

      // Persist to database
      try {
        await supabase
          .from("user_subscriptions")
          .update({
            usage_data: {
              ...usage,
              [featureType]: (usage[featureType as keyof UsageData] || 0) + count,
            },
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);
      } catch (err) {
        console.error("Error updating usage:", err);
      }
    },
    [user, usage, isGuest]
  );

  /**
   * Get current usage for a feature
   */
  const getUsage = useCallback(
    (featureType: FeatureType) => {
      const plan = PLANS[userPlan];
      const limit = getLimit(plan, featureType);
      const used = usage[featureType as keyof UsageData] || 0;
      const remaining = Math.max(0, limit - used);
      const percentage = limit > 0 ? (used / limit) * 100 : 0;

      return {
        used,
        limit,
        remaining,
        percentage,
        isLimited: percentage >= 70,
        isAtLimit: used >= limit,
      };
    },
    [userPlan, usage]
  );

  /**
   * Reset usage (admin/testing only)
   */
  const resetUsage = useCallback(async () => {
    const emptyUsage: UsageData = {
      bookings: 0,
      customers: 0,
      whatsapp: 0,
      emails: 0,
      invoices: 0,
      team: 0,
    };

    setUsage(emptyUsage);

    if (user) {
      try {
        await supabase
          .from("user_subscriptions")
          .update({
            usage_data: emptyUsage,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);
      } catch (err) {
        console.error("Error resetting usage:", err);
      }
    }
  }, [user]);

  /**
   * Upgrade to new plan
   */
  const upgradePlan = useCallback(
    async (newPlan: UserPlan) => {
      if (!user) return;

      try {
        const { error } = await supabase
          .from("user_subscriptions")
          .update({
            plan: newPlan,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);

        if (!error) {
          setUserPlan(newPlan);
          return true;
        }
      } catch (err) {
        console.error("Error upgrading plan:", err);
      }
      return false;
    },
    [user]
  );

  return {
    userPlan,
    usage,
    loading,
    guestActionCount,
    checkAccess,
    recordUsage,
    getUsage,
    resetUsage,
    upgradePlan,
  };
};
