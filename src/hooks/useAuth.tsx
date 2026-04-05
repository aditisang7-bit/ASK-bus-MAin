import { useEffect, useState, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { UserPlan } from "@/lib/plans";

type User = {
  id: string;
  email?: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  userPlan: UserPlan;
  signOut: () => Promise<void>;
  enterGuestMode: () => void;
  upgradePlan: (newPlan: UserPlan) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isGuest: false,
  userPlan: "free",
  signOut: async () => {},
  enterGuestMode: () => {},
  upgradePlan: async () => false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [userPlan, setUserPlan] = useState<UserPlan>("free");

  useEffect(() => {
    // Check current session
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email,
          });
          setIsGuest(false);
        }
      } catch (err) {
        console.error("Auth check error:", err);
      } finally {
        setLoading(false);
      }
    };
    checkUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email,
          });
          setIsGuest(false);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );
    
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Load user plan when user is set
  useEffect(() => {
    if (isGuest) {
      setUserPlan("guest");
      return;
    }

    if (!user) {
      setUserPlan("free");
      return;
    }

    const loadUserPlan = async () => {
      try {
        const { data, error } = await supabase
          .from("user_profiles")
          .select("subscription_plan")
          .eq("user_id", user.id)
          .single();

        if (data && data.subscription_plan) {
          setUserPlan(data.subscription_plan as UserPlan);
        } else {
          setUserPlan("free");
        }
      } catch (err) {
        console.error("Error loading user plan:", err);
        setUserPlan("free");
      }
    };

    loadUserPlan();
  }, [user, isGuest]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsGuest(false);
    setUserPlan("free");
  };

  const enterGuestMode = () => {
    setIsGuest(true);
    setUserPlan("guest");
  };

  const upgradePlan = async (newPlan: UserPlan): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ subscription_plan: newPlan })
        .eq("user_id", user.id);

      if (!error) {
        setUserPlan(newPlan);
        return true;
      }
    } catch (err) {
      console.error("Error upgrading plan:", err);
    }
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isGuest,
        userPlan,
        signOut,
        enterGuestMode,
        upgradePlan,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

