import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Rocket, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guestUsageCount: number;
};

const SignupModal = ({ open, onOpenChange, guestUsageCount }: Props) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2 text-xl font-bold">
            <Rocket className="w-5 h-5 text-accent" />
            You're off to a great start 🚀
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground pt-2">
            You've experienced how ASK Business Manager works. Create your free account to continue and save your progress.
          </DialogDescription>
        </DialogHeader>

        <div className="glass-card rounded-xl p-4 my-4 space-y-3">
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
               <span className="text-accent text-xs font-bold">{guestUsageCount}</span>
            </div>
            <p className="text-sm font-medium text-foreground">
              Actions successfully completed in Guest Mode.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-foreground">
              Your data will be <span className="font-bold">محفوظ (saved securely)</span> when you sign up.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={() => {
              onOpenChange(false);
              navigate("/auth");
            }}
            className="w-full hero-gradient text-primary-foreground font-semibold py-6 text-lg hover:opacity-90"
          >
            Create Free Account
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SignupModal;
