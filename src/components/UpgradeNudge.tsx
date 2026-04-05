/**
 * UpgradeNudge - Dashboard banner to encourage plan upgrades
 * Shows at 70% usage or on key milestones
 */

import { useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FeatureType, UserPlan } from "@/lib/plans";
import { PLANS } from "@/lib/plans";

interface UpgradeNudgeProps {
  feature: FeatureType;
  currentPlan: UserPlan;
  used: number;
  limit: number;
  onUpgradeClick?: () => void;
}

export function UpgradeNudge({
  feature,
  currentPlan,
  used,
  limit,
  onUpgradeClick,
}: UpgradeNudgeProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const percentage = limit > 0 ? (used / limit) * 100 : 0;
  const showNudge = percentage >= 70;

  if (!showNudge || currentPlan === "pro") return null;

  const getMessageByFeature = () => {
    const plan = PLANS[currentPlan];
    const featureLimits = plan.limits;

    switch (feature) {
      case "bookings":
        return "You're taking more bookings! 📈 Upgrade to handle unlimited demand.";
      case "customers":
        return "Your customer base is growing! 👥 Upgrade to manage more customers.";
      case "whatsapp":
        return "WhatsApp is working hard! 💬 Upgrade to send more messages.";
      case "emails":
        return "Your emails are engaging! 📧 Upgrade for more sending capacity.";
      default:
        return `You're using ${percentage.toFixed(0)}% of your ${feature} limit. Upgrade to unlock more!`;
    }
  };

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3 flex-1">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-amber-900">
            You're growing fast! 🚀
          </p>
          <p className="text-sm text-amber-800 mt-1">
            {getMessageByFeature()}
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              onClick={onUpgradeClick}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Upgrade Plan
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDismissed(true)}
              className="text-amber-700 border-amber-200"
            >
              Remind Later
            </Button>
          </div>
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-600 hover:text-amber-700"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

