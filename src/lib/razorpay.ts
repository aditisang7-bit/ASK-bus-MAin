/**
 * Razorpay Payment Integration
 * Handle subscription payments and plan upgrades
 */

import type { UserPlan } from "@/lib/plans";
import { PLANS, formatPrice } from "@/lib/plans";
import { insforge } from "@/integrations/insforge/client";

export interface PaymentConfig {
  planId: UserPlan;
  userId: string;
  email: string;
  userName?: string;
  phone?: string;
}

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

/**
 * Initialize Razorpay script
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Create Razorpay order via backend
 */
export async function createRazorpayOrder(
  planId: UserPlan,
  userId: string
): Promise<{ orderId: string; amount: number } | null> {
  try {
    const plan = PLANS[planId];

    const { data, error } = await insforge.functions.invoke(
      "razorpay-order",
      {
        body: {
          planId,
          userId,
          amount: plan.price * 100, // Convert to paise
          currency: "INR",
          description: `ASK Business Manager - ${plan.name}`,
        },
      }
    );

    if (error) throw error;

    return {
      orderId: data.orderId,
      amount: plan.price,
    };
  } catch (err) {
    console.error("Error creating Razorpay order:", err);
    return null;
  }
}

/**
 * Verify payment and update user plan
 */
export async function verifyPayment(
  response: RazorpayResponse,
  planId: UserPlan,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await insforge.functions.invoke(
      "razorpay-verify",
      {
        body: {
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_signature: response.razorpay_signature,
          planId,
          userId,
        },
      }
    );

    if (error) {
      console.error("Payment verification failed:", error);
      return false;
    }

    return data.success === true;
  } catch (err) {
    console.error("Error verifying payment:", err);
    return false;
  }
}

/**
 * Open Razorpay checkout modal
 */
export async function openRazorpayCheckout(
  config: PaymentConfig,
  onSuccess: (response: RazorpayResponse) => void,
  onError: (error: any) => void
): Promise<void> {
  try {
    // Load Razorpay script
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      throw new Error("Failed to load Razorpay script");
    }

    // Create order
    const orderData = await createRazorpayOrder(config.planId, config.userId);
    if (!orderData) {
      throw new Error("Failed to create payment order");
    }

    const plan = PLANS[config.planId];

    // Open checkout
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      order_id: orderData.orderId,
      amount: orderData.amount * 100, // Convert to paise
      currency: "INR",
      name: "ASK Business Manager",
      description: `Upgrade to ${plan.name}`,
      image: "/logo.png",
      prefill: {
        email: config.email,
        contact: config.phone || "",
        name: config.userName || "",
      },
      theme: {
        color: "#9D4EDD", // Purple theme
      },
      handler: onSuccess,
    };

    // @ts-ignore - Razorpay global
    const razorpay = new window.Razorpay(options);
    razorpay.open();
  } catch (err) {
    console.error("Error opening Razorpay checkout:", err);
    onError(err);
  }
}

/**
 * Format subscription details for display
 */
export function getSubscriptionDetails(planId: UserPlan) {
  const plan = PLANS[planId];

  return {
    name: plan.name,
    price: formatPrice(plan.price),
    priceRaw: plan.price,
    interval: plan.interval,
    description: plan.description,
    features: plan.features,
  };
}

/**
 * Calculate subscription savings
 */
export function calculateSavings(planId: UserPlan) {
  const plan = PLANS[planId];

  if (planId === "starter") {
    // ₹199/month = ₹2388/year vs ₹2400 (monthly × 12)
    return {
      monthlyPrice: formatPrice(plan.price),
      annualPrice: formatPrice(plan.price * 12),
      savings: formatPrice(plan.price * 0.5), // Theoretical discount
    };
  }

  return null;
}
