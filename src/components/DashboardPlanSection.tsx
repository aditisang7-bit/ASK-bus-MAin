/**
 * DashboardPlanSection - Shows current plan, usage bars, and upgrade button
 * Should be added to the Dashboard header
 */

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { PLANS, type FeatureType } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanBadge } from "./PlanBadge";
import { UsageBar } from "./UsageBar";
import { UpgradeModal } from "./modals/UpgradeModal";
import { AlertCircle, Zap, TrendingUp } from "lucide-react";

interface DashboardPlanSectionProps {
  onUpgradeClick?: () => void;
}

export function DashboardPlanSection({
  onUpgradeClick,
}: DashboardPlanSectionProps) {
  const { userPlan, isGuest } = useAuth();
  const { getUsage } = usePlanAccess();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const plan = PLANS[userPlan];
  const featuresToShow: FeatureType[] = [
    "bookings",
    "customers",
    "whatsapp",
    "emails",
  ];
  const usageMetrics = featuresToShow.map((feature) => ({
    feature,
    ...getUsage(feature),
  }));

  const handleUpgrade = () => {
    setShowUpgradeModal(true);
    onUpgradeClick?.();
  };

  if (isGuest) {
    return (
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <p className="font-medium text-blue-900">Guest Mode Active</p>
              <p className="text-sm text-blue-700 mt-1">
                You can try 2 quick actions. Data will not be saved.
              </p>
              <Button size="sm" className="mt-3 bg-blue-600 hover:bg-blue-700">
                Sign Up for Free
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Your Plan & Usage</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            <PlanBadge plan={userPlan} size="md" />
            {userPlan !== "pro" && (
              <Button
                size="sm"
                onClick={handleUpgrade}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Upgrade Plan
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {userPlan !== "pro" && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900">
                    Unlock more features
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    Upgrade to {userPlan === "free" ? "Starter" : "Growth"} for
                    unlimited access and powerful automation tools.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <p className="font-medium text-gray-700">Usage Overview</p>
            {usageMetrics.map(
              ({ feature, used, limit, percentage, isLimited }) => (
                <div key={feature} className="space-y-2">
                  <UsageBar
                    feature={feature}
                    used={used}
                    limit={limit}
                    showLabel={true}
                    showPercentage={true}
                  />
                  {isLimited && (
                    <div className="bg-amber-50 relative overflow-hidden rounded-md p-3 border border-amber-200 mt-2 flex items-start gap-2 shadow-sm">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-bl-full -mr-8 -mt-8" />
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-900">
                          You're growing fast 🚀 
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          Upgrade to avoid interruption ({percentage.toFixed(0)}% used)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-gray-600 mb-3">
              <span className="font-medium">Current Plan:</span> {plan.name}
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              {plan.features.slice(0, 5).map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  {feature}
                </li>
              ))}
              {plan.features.length > 5 && (
                <li className="text-gray-500">
                  +{plan.features.length - 5} more features
                </li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentPlan={userPlan}
        onUpgradeClick={(plan) => {
          // Handle upgrade - will be integrated with payment
          console.log("Upgrade to:", plan);
        }}
      />
    </>
  );
}

