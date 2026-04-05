/**
 * FeatureLock - Gray out/lock UI for premium features with upgrade prompt
 */

import { ReactNode } from "react";
import { Lock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UserPlan } from "@/lib/plans";
import { PLANS } from "@/lib/plans";

interface FeatureLockProps {
  children: ReactNode;
  isLocked: boolean;
  requiredPlan?: UserPlan;
  onUnlockClick?: () => void;
}

export function FeatureLock({
  children,
  isLocked,
  requiredPlan = "pro",
  onUnlockClick,
}: FeatureLockProps) {
  if (!isLocked) {
    return <>{children}</>;
  }

  const plan = PLANS[requiredPlan];

  return (
    <div className="relative group overflow-hidden rounded-lg">
      <div className="opacity-40 blur-[2px] pointer-events-none select-none transition-all duration-300">
        {children}
      </div>

      <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10 transition-opacity">
        <div className="text-center p-4">
          <div className="bg-muted px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 shadow-sm border border-border inline-flex">
            <Lock className="w-4 h-4 text-muted-foreground text-accent" />
            <span className="text-foreground">🔒 Available in {plan.name}</span>
          </div>
          {onUnlockClick && (
            <Button
              size="sm"
              onClick={onUnlockClick}
              className="mt-3 hero-gradient text-primary-foreground font-semibold hover:opacity-90 w-full"
            >
              <Zap className="w-4 h-4 mr-1" />
              Unlock Now
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
