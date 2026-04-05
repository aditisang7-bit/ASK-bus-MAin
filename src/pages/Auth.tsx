import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { enterGuestMode, user } = useAuth();

  const upgradeIntent = searchParams.get("upgrade") === "true";
  const redirectTo = searchParams.get("redirect");

  // If user is already logged in and came here for upgrade, redirect to pricing
  useEffect(() => {
    if (user && upgradeIntent) {
      navigate(redirectTo || "/#pricing", { replace: true });
    } else if (user && !upgradeIntent) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, upgradeIntent, redirectTo, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        const savedPlan = localStorage.getItem("checkout_plan");
        // Redirect based on intent
        if (savedPlan || upgradeIntent) {
          navigate("/#pricing", { replace: true });
        } else if (redirectTo) {
          navigate(redirectTo, { replace: true });
        } else {
          navigate("/dashboard");
        }
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success("Account created! Check your email to verify.");
        const savedPlan = localStorage.getItem("checkout_plan");
        if (savedPlan || upgradeIntent) {
          navigate("/#pricing", { replace: true });
        }
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-accent/10 blur-[100px] animate-pulse-glow" />
      </div>

      <div className="relative glass-card rounded-2xl p-8 w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <img src={logo} alt="ASK Business Manager" className="h-10 w-10 object-contain" />
          <span className="font-bold text-xl tracking-tight-custom text-foreground">ASK Business Manager</span>
        </div>

        {upgradeIntent && (
          <div className="mb-4 p-3 rounded-lg bg-accent/10 border border-accent/20 text-center">
            <p className="text-sm text-accent font-medium">Create an account or login to upgrade your plan</p>
          </div>
        )}

        <h2 className="text-2xl font-bold text-foreground text-center mb-2">
          {isLogin ? "Welcome back" : "Create account"}
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-6">
          {isLogin ? "Sign in to your dashboard" : "Start managing your business"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-foreground">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="bg-input border-border text-foreground" />
          </div>
          <div>
            <Label htmlFor="password" className="text-foreground">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="bg-input border-border text-foreground" />
          </div>
          <Button type="submit" disabled={loading} className="w-full hero-gradient text-primary-foreground font-semibold hover:opacity-90">
            {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
          </Button>
        </form>

        <p className="text-sm text-muted-foreground text-center mt-6">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-accent hover:underline font-medium">
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;