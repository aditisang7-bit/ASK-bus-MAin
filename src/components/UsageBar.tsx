/**
 * UsageBar - Display usage progress for features
 */

import type { FeatureType } from "@/lib/plans";

interface UsageBarProps {
  feature: FeatureType;
  used: number;
  limit: number;
  showLabel?: boolean;
  showPercentage?: boolean;
}

const FEATURE_LABELS: Record<FeatureType, string> = {
  bookings: "Bookings",
  customers: "Customers",
  whatsapp: "WhatsApp",
  emails: "Emails",
  invoices: "Invoices",
  team: "Team Members",
  ai_marketing: "AI Marketing",
  analytics: "Analytics",
  branding: "Branding",
  priority_support: "Priority Support",
};

export function UsageBar({
  feature,
  used,
  limit,
  showLabel = true,
  showPercentage = true,
}: UsageBarProps) {
  const percentage = limit > 0 ? (used / limit) * 100 : 0;
  const isUnlimited = limit > 999999;

  const getColorClass = () => {
    if (percentage < 70) return "bg-green-500";
    if (percentage < 90) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            {FEATURE_LABELS[feature]}
          </span>
          <span className="text-sm text-gray-600">
            {used}/{isUnlimited ? "∞" : limit}
            {showPercentage && !isUnlimited && (
              <span className="ml-1 text-gray-500">
                ({percentage.toFixed(0)}%)
              </span>
            )}
          </span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all ${getColorClass()}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
