/**
 * Plan definitions, pricing, and usage limits for ASK Business Manager
 * Indian market pricing in INR (₹)
 */

export type UserPlan = "guest" | "free" | "starter" | "growth" | "pro";

export type FeatureType =
  | "bookings"
  | "customers"
  | "whatsapp"
  | "emails"
  | "invoices"
  | "team"
  | "ai_marketing"
  | "analytics"
  | "branding"
  | "priority_support";

export interface PlanLimits {
  bookings: number;
  customers: number;
  whatsapp: number;
  emails: number;
  invoices: number;
  team: number;
  ai_marketing: boolean;
  advanced_analytics: boolean;
  custom_branding: boolean;
  priority_support: boolean;
}

export interface Plan {
  id: UserPlan;
  name: string;
  price: number; // in INR
  interval: "month" | "year";
  limits: PlanLimits;
  description: string;
  features: string[];
  highlighted: boolean;
}

// Plan definitions
export const PLANS: Record<UserPlan, Plan> = {
  guest: {
    id: "guest",
    name: "Guest Mode",
    price: 0,
    interval: "month",
    limits: {
      bookings: 2, // Limited guest actions
      customers: 2,
      whatsapp: 0,
      emails: 0,
      invoices: 1,
      team: 0,
      ai_marketing: false,
      advanced_analytics: false,
      custom_branding: false,
      priority_support: false,
    },
    description: "Try ASK Business Manager for free",
    features: [
      "Limited demo access",
      "2 actions to explore",
      "No data saved",
    ],
    highlighted: false,
  },
  free: {
    id: "free",
    name: "Free Plan",
    price: 0,
    interval: "month",
    limits: {
      bookings: 10,
      customers: 3,
      whatsapp: 50,
      emails: 0,
      invoices: 10,
      team: 1,
      ai_marketing: false,
      advanced_analytics: false,
      custom_branding: false,
      priority_support: false,
    },
    description: "Perfect for getting started",
    features: [
      "10 bookings",
      "3 customers",
      "50 WhatsApp messages",
      "Invoices",
      "Basic features",
    ],
    highlighted: false,
  },
  starter: {
    id: "starter",
    name: "Starter Plan",
    price: 199,
    interval: "month",
    limits: {
      bookings: 100,
      customers: 200,
      whatsapp: 500,
      emails: 200,
      invoices: 100,
      team: 1,
      ai_marketing: false,
      advanced_analytics: false,
      custom_branding: false,
      priority_support: false,
    },
    description: "Scale your business",
    features: [
      "100 bookings/month",
      "200 customers",
      "500 WhatsApp messages",
      "200 emails/month",
      "Invoices",
      "Basic support",
    ],
    highlighted: false,
  },
  growth: {
    id: "growth",
    name: "Growth Plan",
    price: 499,
    interval: "month",
    limits: {
      bookings: 999999,
      customers: 999999,
      whatsapp: 2000,
      emails: 1000,
      invoices: 999999,
      team: 3,
      ai_marketing: true,
      advanced_analytics: true,
      custom_branding: false,
      priority_support: false,
    },
    description: "Grow faster with AI tools",
    features: [
      "Unlimited bookings",
      "Unlimited customers",
      "2000 WhatsApp messages",
      "1000 emails/month",
      "WhatsApp automation",
      "AI marketing tools",
      "Advanced analytics",
      "Team management (3 members)",
      "Priority support",
    ],
    highlighted: true,
  },
  pro: {
    id: "pro",
    name: "Pro Plan",
    price: 999,
    interval: "month",
    limits: {
      bookings: 999999,
      customers: 999999,
      whatsapp: 10000,
      emails: 5000,
      invoices: 999999,
      team: 10,
      ai_marketing: true,
      advanced_analytics: true,
      custom_branding: true,
      priority_support: true,
    },
    description: "Enterprise-grade power",
    features: [
      "Unlimited everything",
      "10000 WhatsApp messages",
      "5000 emails/month",
      "Full WhatsApp automation",
      "Advanced AI marketing",
      "Custom branding",
      "Team management (10 members)",
      "Priority 24x7 support",
      "Advanced analytics & reporting",
    ],
    highlighted: false,
  },
};

/**
 * Get all paid plans (excluding guest & free)
 */
export function getPaidPlans(): Plan[] {
  return [PLANS.starter, PLANS.growth, PLANS.pro];
}

/**
 * Get upgrade recommendations based on current plan
 */
export function getUpgradePath(currentPlan: UserPlan): Plan[] {
  const order: UserPlan[] = ["guest", "free", "starter", "growth", "pro"];
  const currentIndex = order.indexOf(currentPlan);

  // Show next 2 plans as upgrades
  return order
    .slice(currentIndex + 1, currentIndex + 3)
    .map((planId) => PLANS[planId]);
}

/**
 * Check if feature is available in plan
 */
export function hasFeature(
  plan: Plan,
  feature: FeatureType
): boolean {
  switch (feature) {
    case "bookings":
    case "customers":
    case "whatsapp":
    case "emails":
    case "invoices":
    case "team":
      return true; // All plans have these, limits differ

    case "ai_marketing":
      return plan.limits.ai_marketing;
    case "analytics":
      return plan.limits.advanced_analytics;
    case "branding":
      return plan.limits.custom_branding;
    case "priority_support":
      return plan.limits.priority_support;

    default:
      return false;
  }
}

/**
 * Get limit for a feature in a plan
 */
export function getLimit(plan: Plan, feature: FeatureType): number {
  const limitKey = feature as keyof PlanLimits;
  const limit = plan.limits[limitKey];
  return typeof limit === "number" ? limit : 0;
}

/**
 * Format price with currency
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(price);
}

/**
 * Get display name for plan
 */
export function getPlanDisplayName(plan: UserPlan): string {
  return PLANS[plan].name;
}

