/**
 * Modal to convert guest users to signed-up users
 * High-conversion UI with reassurance and emotional appeal
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Zap } from "lucide-react";
import { Link } from "react-router-dom";

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionCount?: number;
  onSignupClick?: () => void;
}

export function SignupModal({
  isOpen,
  onClose,
  actionCount = 2,
  onSignupClick,
}: SignupModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <DialogTitle className="text-2xl">
            You're off to a great start 🚀
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            You've experience how ASK Business Manager works. Create your free
            account to continue and save your progress.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-6">
          {/* What they've done */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">
                  Great job! You've completed {actionCount} quick actions.
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  This is just a taste of what you can do with a full account.
                </p>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-3">
            <p className="font-medium text-gray-900">With a free account, you get:</p>
            <ul className="space-y-2">
              {[
                { icon: "✅", text: "10 bookings" },
                { icon: "👥", text: "3 customer profiles" },
                { icon: "💬", text: "50 WhatsApp messages" },
                { icon: "📄", text: "Unlimited invoices" },
                { icon: "💾", text: "All data automatically saved" },
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-3 text-sm">
                  <span>{item.icon}</span>
                  <span className="text-gray-700">{item.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Security reassurance */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-700">
              <span className="font-medium">Your data is safe.</span> We use
              enterprise-grade encryption. No spam, ever.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={onSignupClick}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
            asChild
          >
            <Link to="/auth">Create Free Account</Link>
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full text-gray-600"
          >
            Maybe Later
          </Button>
        </div>

        <p className="text-xs text-center text-gray-500 mt-4">
          Already have an account? <Link to="/auth" className="text-purple-600 hover:underline">Sign in here</Link>
        </p>
      </DialogContent>
    </Dialog>
  );
}

