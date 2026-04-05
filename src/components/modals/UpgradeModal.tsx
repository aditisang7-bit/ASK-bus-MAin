/**
 * Modal for prompting users to upgrade their plan
 * Emotional, sales-driven copy with clear CTA
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { UserPlan, FeatureType } from "@/lib/plans";
import { PLANS, getUpgradePath, formatPrice } from "@/lib/plans";
import { Check, Zap, TrendingUp } from "lucide-react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: UserPlan;
  featureType?: FeatureType;
  usage?: {
    used: number;
    limit: number;
    percentage: number;
  };
  onUpgradeClick?: (plan: UserPlan) => void;
}

export function UpgradeModal({
  isOpen,
  onClose,
  currentPlan,
  featureType,
  usage,
  onUpgradeClick,
}: UpgradeModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<UserPlan | null>(null);
  const upgradePlans = getUpgradePath(currentPlan);

  const handleUpgrade = () => {
    if (selectedPlan && onUpgradeClick) {
      onUpgradeClick(selectedPlan);
    }
  };

  const getEmotionalMessage = (feature?: FeatureType) => {
    if (!feature) {
      return "You're growing fast! 🚀 Unlock unlimited features to scale faster.";
    }

    switch (feature) {
      case "bookings":
        return "Your bookings are booming! 📈 Keep the momentum going with unlimited bookings.";
      case "customers":
        return "More customers, more growth! 👥 Expand your customer base without limits.";
      case "whatsapp":
        return "WhatsApp is your superpower! 💬 Send unlimited messages and automate your workflow.";
      case "emails":
        return "Email marketing works! 📧 Send more campaigns and reach more customers.";
      case "team":
        return "Growing your team? 👨‍💼 Add more members and delegate with ease.";
      case "ai_marketing":
        return "AI marketing tools await! 🤖 Automate your marketing and save hours every week.";
      case "analytics":
        return "Deep insights drive growth! 📊 Get advanced analytics to make smarter decisions.";
      default:
        return "Don't stop your business growth 🚀 Upgrade now to unlock more power.";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <DialogTitle className="text-2xl">Upgrade Required 🚀</DialogTitle>
          <DialogDescription className="text-base mt-2">
            {getEmotionalMessage(featureType)}
          </DialogDescription>
        </DialogHeader>

        {usage && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 my-4">
            <p className="text-sm font-medium text-amber-900">
              Current Usage: {usage.used}/{usage.limit}
            </p>
            <div className="mt-2 w-full bg-amber-200 rounded-full h-2">
              <div
                className="bg-amber-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(usage.percentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-amber-700 mt-1">
              {usage.percentage.toFixed(0)}% of your limit used
            </p>
          </div>
        )}

        <div className="grid gap-3 my-6">
          {upgradePlans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative p-4 rounded-lg border-2 text-left transition-all ${
                selectedPlan === plan.id
                  ? "border-purple-500 bg-purple-50"
                  : "border-gray-200 bg-white hover:border-purple-200"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                    {plan.highlighted && (
                      <Badge className="bg-gradient-to-r from-purple-500 to-pink-500">
                        Most Popular
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {plan.description}
                  </p>
                </div>
                <div className="ml-4 text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    {plan.price === 0 ? "Free" : `₹${plan.price}`}
                  </p>
                  {plan.price > 0 && (
                    <p className="text-xs text-gray-500">/month</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3">
                {plan.features.slice(0, 4).map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>

              {selectedPlan === plan.id && (
                <div className="absolute top-3 right-3 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Maybe Later
          </Button>
          <Button
            onClick={handleUpgrade}
            disabled={!selectedPlan}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Upgrade Now
          </Button>
        </div>

        <p className="text-xs text-center text-gray-500 mt-4">
          🎁 Special: Free tier users can upgrade anytime and get instant access to all features.
        </p>
      </DialogContent>
    </Dialog>
  );
}
