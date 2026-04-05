import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

type UpgradeBannerProps = {
  resource: string;
  current: number;
  max: number;
  plan: string;
};

const UpgradeBanner = ({ resource, current, max, plan }: UpgradeBannerProps) => {
  const isFeatureBlocked = max === 0;

  const handleUpgrade = () => {
    // Scroll to pricing on homepage
    window.location.href = "/#pricing";
  };

  return (
    <div className="glass-card rounded-xl p-4 border border-accent/20 mb-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
            <Crown className="w-4 h-4 text-accent" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {isFeatureBlocked
                ? `${resource} is not available on the ${plan} plan`
                : `${resource} limit reached (${current}/${max})`}
            </p>
            <p className="text-xs text-muted-foreground">
              Upgrade your plan to {isFeatureBlocked ? "unlock this feature" : "get more capacity"}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleUpgrade}
          className="hero-gradient text-primary-foreground font-semibold hover:opacity-90 shrink-0"
        >
          <Crown className="w-3 h-3 mr-1" /> Upgrade
        </Button>
      </div>
      {!isFeatureBlocked && max > 0 && (
        <div className="mt-3">
          <div className="w-full bg-secondary rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full hero-gradient"
              style={{ width: `${Math.min((current / max) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default UpgradeBanner;
