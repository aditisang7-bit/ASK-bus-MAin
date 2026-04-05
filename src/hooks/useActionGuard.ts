/**
 * Hook to guard actions with plan limits and show appropriate modals
 * Usage: Before any action, call checkAndGuardAction() to check limits
 */

import { useState } from "react";
import { useAuth } from "./useAuth";
import { usePlanAccess } from "./usePlanAccess";
import { useToast } from "./use-toast";
import type { FeatureType, UserPlan } from "@/lib/plans";

interface GuardedActionConfig {
  feature: FeatureType;
  actionName: string;
  onAllowed?: () => void | Promise<void>;
  onBlocked?: () => void;
}

export const useActionGuard = () => {
  const { isGuest } = useAuth();
  const { checkAccess, recordUsage, guestActionCount } = usePlanAccess();
  const { toast } = useToast();
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [currentFeature, setCurrentFeature] = useState<FeatureType>("bookings");
  const [lastBlockedAction, setLastBlockedAction] = useState<string | null>(
    null
  );

  /**
   * Guard an action - checks access and records usage
   * Returns true if action is allowed, false if blocked
   */
  const checkAndGuardAction = async (
    config: GuardedActionConfig
  ): Promise<boolean> => {
    const { feature, actionName, onAllowed, onBlocked } = config;
    const access = checkAccess(feature);

    if (!access.hasAccess) {
      // Block action
      setLastBlockedAction(actionName);
      setCurrentFeature(feature);

      if (isGuest && guestActionCount >= 2) {
        // Show signup modal for guests
        setShowSignupModal(true);
        toast({
          title: "🚀 Sign up to continue",
          description: "You've experienced how ASK Business Manager works.",
          variant: "default",
        });
      } else {
        // Show upgrade modal for free/paid users
        setShowUpgradeModal(true);
        toast({
          title: "Upgrade Required",
          description: access.reason || "Limit reached. Upgrade your plan.",
          variant: "destructive",
        });
      }

      onBlocked?.();
      return false;
    }

    // Action is allowed
    try {
      if (onAllowed) {
        await onAllowed();
      }
      // Record usage after action succeeds
      await recordUsage(feature);

      toast({
        title: "✅ Success",
        description: `${actionName} created successfully.`,
      });

      return true;
    } catch (err) {
      console.error(`Error executing ${actionName}:`, err);
      toast({
        title: "Error",
        description: `Failed to ${actionName}. Please try again.`,
        variant: "destructive",
      });
      return false;
    }
  };

  /**
   * Middleware-style guard for React components
   * Usage: if (!isActionAllowed(feature)) return <UpgradePrompt />
   */
  const isActionAllowed = (feature: FeatureType): boolean => {
    const access = checkAccess(feature);
    return access.hasAccess;
  };

  /**
   * Get action context for UI components
   */
  const getActionContext = (feature: FeatureType) => {
    const access = checkAccess(feature);
    return {
      isAllowed: access.hasAccess,
      reason: access.reason,
      usage: access.usage,
      requiresUpgrade: access.requiresUpgrade,
      currentPlan: access.currentPlan,
    };
  };

  return {
    checkAndGuardAction,
    isActionAllowed,
    getActionContext,
    showSignupModal,
    setShowSignupModal,
    showUpgradeModal,
    setShowUpgradeModal,
    currentFeature,
    lastBlockedAction,
  };
};

