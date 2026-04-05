import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Loader2, Check, Star } from "lucide-react";
import { insforge } from "@/integrations/insforge/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PLAN_PRICES, type PlanName } from "@/hooks/usePlan";

declare global {
  interface Window {
    Razorpay: any;
  }
}

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

const planFeatures: Record<string, string[]> = {
  starter: ["100 bookings/mo", "200 customers", "CRM access", "500 WhatsApp/mo", "200 emails/mo"],
  growth: ["Unlimited bookings", "Full Inventory", "Team (3)", "2,000 WhatsApp/mo", "1,000 emails/mo"],
  pro: ["AI features", "Team (10)", "10,000 WhatsApp/mo", "5,000 emails/mo", "White-label"],
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource?: string;
  current?: number;
  max?: number;
  currentPlan: PlanName;
};

const UpgradeModal = ({ open, onOpenChange, resource, current, max, currentPlan }: Props) => {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [yearly, setYearly] = useState(false);
  const queryClient = useQueryClient();

  const planOrder: PlanName[] = ["free", "starter", "growth", "pro"];
  const currentIndex = planOrder.indexOf(currentPlan);

  const availablePlans = (["starter", "growth", "pro"] as PlanName[]).filter(
    (p) => planOrder.indexOf(p) > currentIndex
  );

  const handleUpgrade = async (planKey: string) => {
    setLoadingPlan(planKey);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Failed to load Razorpay");

      const { data, error } = await insforge.functions.invoke("subscribe", {
        body: { plan: planKey, billing_cycle: yearly ? "yearly" : "monthly" },
      });
      if (error) throw error;

      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: "ASK Business Manager",
        description: `${planKey.charAt(0).toUpperCase() + planKey.slice(1)} Plan`,
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
                billing_cycle: yearly ? "yearly" : "monthly",
              },
            });
            if (verifyRes.error || !verifyRes.data?.verified) {
              toast.error("Payment verification failed");
            } else {
              toast.success(`🎉 ${planKey.charAt(0).toUpperCase() + planKey.slice(1)} plan activated!`);
              queryClient.invalidateQueries({ queryKey: ["subscription"] });
              queryClient.invalidateQueries({ queryKey: ["usage"] });
              onOpenChange(false);
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
      toast.error(err.message || "Upgrade error");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2 text-xl font-bold">
            <Crown className="w-5 h-5 text-accent" />
            Don't stop your business growth 🚀
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground pt-1">
            {resource && current !== undefined && max !== undefined
              ? `You've used ${current}/${max} ${resource}. Upgrade now to keep serving your customers without interruption.`
              : "Upgrade now to keep serving your customers without interruption."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-2 glass-card rounded-full p-0.5">
            <button
              onClick={() => setYearly(false)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!yearly ? "hero-gradient text-primary-foreground" : "text-muted-foreground"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${yearly ? "hero-gradient text-primary-foreground" : "text-muted-foreground"}`}
            >
              Yearly (Save 17%)
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {availablePlans.map((planKey) => {
            const price = PLAN_PRICES[planKey];
            if (!price) return null;
            const features = planFeatures[planKey] || [];
            return (
              <div key={planKey} className="glass-card rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-foreground capitalize">{planKey}</h4>
                    {planKey === "growth" && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full hero-gradient text-primary-foreground flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5" /> Popular
                      </span>
                    )}
                  </div>
                  <p className="text-lg font-bold text-foreground">
                    ₹{(yearly ? price.yearly : price.monthly).toLocaleString("en-IN")}
                    <span className="text-xs text-muted-foreground font-normal">/{yearly ? "yr" : "mo"}</span>
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {features.slice(0, 3).map((f) => (
                      <span key={f} className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5 text-accent" /> {f}
                      </span>
                    ))}
                  </div>
                </div>
                <Button
                  size="sm"
                  disabled={loadingPlan === planKey}
                  onClick={() => handleUpgrade(planKey)}
                  className="hero-gradient text-primary-foreground font-semibold hover:opacity-90 shrink-0"
                >
                  {loadingPlan === planKey ? (
                    <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing</>
                  ) : (
                    <>Upgrade</>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {availablePlans.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">You're on the highest plan!</p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;
