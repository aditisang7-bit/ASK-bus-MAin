import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

type Props = {
  daysRemaining: number;
  isExpired: boolean;
};

const TrialBanner = ({ daysRemaining, isExpired }: Props) => {
  if (!isExpired && daysRemaining > 7) return null;

  return (
    <div className={`rounded-xl p-4 mb-4 flex items-center justify-between ${
      isExpired ? "bg-destructive/10 border border-destructive/20" : "bg-accent/10 border border-accent/20"
    }`}>
      <div className="flex items-center gap-3">
        <Crown className={`w-5 h-5 ${isExpired ? "text-destructive" : "text-accent"}`} />
        <div>
          <p className="text-sm font-medium text-foreground">
            {isExpired
              ? "Your trial has ended"
              : `Trial ends in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {isExpired
              ? "Upgrade now to continue using premium features"
              : "Upgrade before your trial expires to keep access"}
          </p>
        </div>
      </div>
      <Link to="/billing">
        <Button size="sm" className="hero-gradient text-primary-foreground font-semibold hover:opacity-90 shrink-0">
          <Crown className="w-3 h-3 mr-1" /> Upgrade Now
        </Button>
      </Link>
    </div>
  );
};

export default TrialBanner;
