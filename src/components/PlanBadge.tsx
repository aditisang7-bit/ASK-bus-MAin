/**
 * PlanBadge - Display current plan with styling
 */

import { Badge } from "@/components/ui/badge";
import type { UserPlan } from "@/lib/plans";
import { PLANS } from "@/lib/plans";
import { Crown, Zap, Star, Gift } from "lucide-react";

interface PlanBadgeProps {
  plan: UserPlan;
  size?: "sm" | "md" | "lg";
}

export function PlanBadge({ plan, size = "md" }: PlanBadgeProps) {
  const planInfo = PLANS[plan];

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2",
  };

  const getIcon = () => {
    switch (plan) {
      case "guest":
        return <Gift className="w-3 h-3" />;
      case "free":
        return <Star className="w-3 h-3" />;
      case "starter":
        return <Zap className="w-3 h-3" />;
      case "growth":
      case "pro":
        return <Crown className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getColors = () => {
    switch (plan) {
      case "guest":
        return "bg-gray-100 text-gray-800";
      case "free":
        return "bg-blue-100 text-blue-800";
      case "starter":
        return "bg-purple-100 text-purple-800";
      case "growth":
        return "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800";
      case "pro":
        return "bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Badge className={`${getColors()} ${sizeClasses[size]} flex items-center gap-1`}>
      {getIcon()}
      {planInfo.name}
    </Badge>
  );
}
