import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Star, Loader2, Shield } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const plans = [
  {
    name: "Starter",
    key: "starter",
    price: { monthly: 299, yearly: 2999 }, // Keep yearly realistic or derived as per ui
    description: "For small shops & local businesses",
    features: [
      "200 bookings/month",
      "200 invoices/month",
      "CRM (200 customers)",
      "Inventory (100 items)",
      "WhatsApp sharing",
      "Smart reminders",
      "Basic dashboard",
      "NO email",
      "NO AI"
    ],
    cta: "Start Free → Upgrade to Starter",
    popular: false,
  },
  {
    name: "Growth",
    key: "growth",
    price: { monthly: 999, yearly: 9999 },
    description: "For growing businesses",
    features: [
      "1000 bookings/month",
      "1000 invoices/month",
      "CRM (1000 customers)",
      "Inventory (500 items)",
      "Advanced reminders",
      "Basic marketing tools (non-AI)",
      "WhatsApp sharing",
      "NO email",
      "NO AI"
    ],
    cta: "Start Free → Upgrade to Growth",
    popular: true,
  },
  {
    name: "Pro",
    key: "pro",
    price: { monthly: 2499, yearly: 24999 },
    description: "For serious businesses & teams",
    features: [
      "Email sending",
      "Email automation",
      "AI tools",
      "Team management (10 members)",
      "Advanced analytics",
      "Priority support"
    ],
    cta: "Start Free → Upgrade to Pro",
    popular: false,
  },
];

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const PricingSection = () => {
  const [isYearly, setIsYearly] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const navigate = useNavigate();

  const yearlySavings = Math.round((1 - (plans[1].price.yearly / (plans[1].price.monthly * 12))) * 100);

  const handleSubscribe = async (planKey: string) => {
    const { data: { user } } = await insforge.auth.getCurrentUser();
    if (!user) {
      localStorage.setItem("checkout_plan", planKey);
      navigate("/auth?upgrade=true");
      return;
    }

    setLoadingPlan(planKey);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Failed to load Razorpay");

      const { data, error } = await insforge.functions.invoke("subscribe", {
        body: { plan: planKey, billing_cycle: isYearly ? "yearly" : "monthly" },
      });
      if (error) throw error;

      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: "ASK Business Manager",
        description: `${planKey.charAt(0).toUpperCase() + planKey.slice(1)} Plan - ${isYearly ? "Yearly" : "Monthly"}`,
        order_id: data.order_id,
        theme: { color: "#6366f1" },
        handler: async (response: any) => {
          try {
            const verifyRes = await insforge.functions.invoke("activate-subscription", {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan: planKey,
                billing_cycle: isYearly ? "yearly" : "monthly",
              },
            });
            if (verifyRes.error || !verifyRes.data?.verified) {
              toast.error("Payment verification failed");
            } else {
              toast.success(`🎉 ${planKey.charAt(0).toUpperCase() + planKey.slice(1)} plan activated!`);
              navigate("/dashboard");
            }
          } catch {
            toast.error("Subscription activation error");
          }
        },
        modal: { ondismiss: () => setLoadingPlan(null) },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp: any) => {
        toast.error(`Payment failed: ${resp.error.description}`);
        setLoadingPlan(null);
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || "Subscription error");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <section id="pricing" className="relative py-32">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      </div>

      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight-custom mb-4">
            Simple, <span className="text-gradient">transparent</span> pricing
          </h2>
          <p className="text-muted-foreground text-lg mb-2">Start free. Upgrade anytime when you're ready.</p>
          <div className="max-w-md mx-auto mb-8 bg-secondary/50 rounded-lg p-4 border border-border flex flex-col items-center">
            <h4 className="font-semibold text-foreground mb-1">FREE PLAN</h4>
            <p className="text-sm text-muted-foreground mb-3 text-center">Start free with 3 bookings and 3 invoices. No email or AI features included.</p>
            <Button variant="outline" size="sm" onClick={() => navigate("/auth")} className="w-full font-semibold border-border hover:bg-muted">Start Free</Button>
          </div>

          <div className="inline-flex items-center gap-3 glass-card rounded-full p-1">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${!isYearly ? "hero-gradient text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${isYearly ? "hero-gradient text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Yearly <span className="text-accent text-xs ml-1">Save {yearlySavings}%</span>
            </button>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative glass-card rounded-2xl p-6 flex flex-col ${plan.popular ? "ring-1 ring-primary/50 glow-primary scale-105" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 hero-gradient px-3 py-1 rounded-full text-xs font-semibold text-primary-foreground">
                  <Star className="w-3 h-3" /> Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
              </div>

              <div className="mb-2">
                <span className="text-4xl font-bold text-foreground">
                  ₹{(isYearly ? plan.price.yearly : plan.price.monthly).toLocaleString("en-IN")}
                </span>
                <span className="text-sm text-muted-foreground">/{isYearly ? "year" : "month"}</span>
              </div>
              {isYearly && (
                <p className="text-xs text-accent mb-4">
                  ₹{Math.round(plan.price.yearly / 12).toLocaleString("en-IN")}/mo billed yearly
                </p>
              )}
              {!isYearly && <div className="mb-4" />}

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleSubscribe(plan.key)}
                disabled={loadingPlan === plan.key}
                className={`w-full font-semibold ${plan.popular ? "hero-gradient text-primary-foreground glow-primary hover:opacity-90" : "bg-secondary text-foreground hover:bg-muted"}`}
              >
                {loadingPlan === plan.key ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                ) : (
                  plan.cta
                )}
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Trust elements */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex flex-wrap items-center justify-center gap-6 mt-12 text-xs text-muted-foreground"
        >
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-accent" />
            <span>No credit card required</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-accent" />
            <span>Upgrade anytime</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 text-accent" />
            <span>Designed for small businesses in India</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-accent" />
            <span>UPI, Cards & Net Banking accepted</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
