import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Bookings from "./pages/Bookings";
import Billing from "./pages/Billing";
import Inventory from "./pages/Inventory";
import Team from "./pages/Team";
import CRM from "./pages/CRM";
import AIStudio from "./pages/AIStudio";
import Marketing from "./pages/Marketing";
import WhatsApp from "./pages/WhatsApp";
import Reminders from "./pages/Reminders";
import BusinessSettings from "./pages/BusinessSettings";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 rounded-lg hero-gradient animate-pulse" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/auth" element={<Auth />} />
    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
    <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
    <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
    <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
    <Route path="/crm" element={<ProtectedRoute><CRM /></ProtectedRoute>} />
    <Route path="/ai-studio" element={<ProtectedRoute><AIStudio /></ProtectedRoute>} />
    <Route path="/marketing" element={<ProtectedRoute><Marketing /></ProtectedRoute>} />
    <Route path="/whatsapp" element={<ProtectedRoute><WhatsApp /></ProtectedRoute>} />
    <Route path="/reminders" element={<ProtectedRoute><Reminders /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><BusinessSettings /></ProtectedRoute>} />
    <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
