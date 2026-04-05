import { motion } from "framer-motion";
import {
  CreditCard, Calendar, Package, Users, UserCircle, MessageSquare,
  Image, Bell, Phone, BarChart3, Zap, Mail, Sparkles, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const features = [
  {
    icon: CreditCard,
    title: "GST Billing & Invoicing",
    description: "Auto-generate GST-ready invoices with QR codes, payment tracking, and PDF downloads.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Calendar,
    title: "Appointments & Bookings",
    description: "Complete booking system with calendar view, status tracking, and auto confirmations.",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp Messaging",
    description: "Send invoices and updates via WhatsApp with one click (manual sharing, no automation).",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Package,
    title: "Inventory Management",
    description: "Track stock levels, set low-stock alerts, and manage products with ease.",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    icon: UserCircle,
    title: "Customer CRM",
    description: "Full customer profiles, history tracking, and relationship management.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Users,
    title: "Team Management",
    description: "Manage employees, roles, departments, and track attendance.",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    icon: Image,
    title: "AI Banner Generator",
    description: "Create marketing banners for Instagram, WhatsApp, and Facebook with AI.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    description: "Track upcoming payments and appointments with reminder alerts.",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Revenue tracking, order insights, appointment stats, and business analytics.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
];

const aiFeatures = [
  { icon: Zap, label: "AI Invoice Generation" },
  { icon: Image, label: "AI Banner Creator" },
  { icon: Phone, label: "AI Voice Calls" },
  { icon: Bell, label: "Smart Automation" },
];

const upcomingFeatures = [
  { id: "whatsapp_automation", label: "WhatsApp Automation", icon: Zap, color: "text-green-500", bgColor: "bg-green-500/10" },
  { id: "email_campaigns", label: "Email Campaigns", icon: Mail, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  { id: "ai_marketing", label: "AI Marketing", icon: Sparkles, color: "text-purple-500", bgColor: "bg-purple-500/10" },
  { id: "voice_call_reminders", label: "Voice Call Reminders", icon: Phone, color: "text-orange-500", bgColor: "bg-orange-500/10" },
];

const FeaturesSection = () => {
  const [loadingFeature, setLoadingFeature] = useState<string | null>(null);
  const [notified, setNotified] = useState<string[]>([]);
  const navigate = useNavigate();

  const handleNotify = async (featureId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth?redirect=/#features");
      return;
    }

    setLoadingFeature(featureId);
    try {
      const { error } = await supabase.from("feature_requests").insert({
        user_id: session.user.id,
        feature_name: featureId
      });
      
      // 23505 is PostgreSQL unique violation constraint
      if (error && error.code !== "23505") throw error;
      
      setNotified((prev) => [...prev, featureId]);
      toast.success("You’ll be notified when this feature is live 🚀");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit request.");
    } finally {
      setLoadingFeature(null);
    }
  };

  return (
    <section className="relative py-32 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>

      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight-custom mb-4">
            Everything to{" "}
            <span className="text-gradient">run & grow</span> your business
          </h2>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto">
            Nine powerful modules working together — billing, bookings, CRM, marketing, and more.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-20">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08, duration: 0.5 }}
              className="glass-card rounded-xl p-6 group hover:bg-card/80 transition-colors cursor-default"
            >
              <div className={`w-10 h-10 rounded-lg ${feature.bgColor} flex items-center justify-center mb-4`}>
                <feature.icon className={`w-5 h-5 ${feature.color}`} />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card rounded-2xl p-8 mb-16"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold text-foreground mb-1">AI-Powered Features</h3>
              <p className="text-sm text-muted-foreground">AI-powered marketing tools (available in Pro plan)</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {aiFeatures.map((ai) => (
                <div key={ai.label} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-sm text-foreground">
                  <ai.icon className="w-4 h-4 text-accent" />
                  {ai.label}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Coming Soon Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h3 className="text-2xl font-bold text-foreground mb-2">Coming Soon 🚀</h3>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto mb-10">We are constantly building. Request early access and be the first to know when these pro features roll out.</p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            {upcomingFeatures.map((f, i) => (
              <motion.div 
                key={f.id} 
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card rounded-xl p-5 flex flex-col items-center text-center justify-between group hover:bg-card/80 transition-colors"
              >
                <div className="w-full flex justify-center mb-4 mt-2">
                  <div className={`w-12 h-12 rounded-full ${f.bgColor} flex items-center justify-center`}>
                     <f.icon className={`w-6 h-6 ${f.color}`} />
                  </div>
                </div>
                <h4 className="font-semibold text-foreground mb-4">{f.label}</h4>
                <Button 
                  onClick={() => handleNotify(f.id)} 
                  disabled={notified.includes(f.id) || loadingFeature === f.id}
                  variant={notified.includes(f.id) ? "secondary" : "outline"}
                  className={`w-full border-border text-xs ${notified.includes(f.id) ? "text-muted-foreground bg-secondary" : "text-foreground hover:bg-secondary"}`}
                >
                  {loadingFeature === f.id ? <><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Requesting...</> : notified.includes(f.id) ? "Requested ✔" : "Notify Me"}
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.div>

      </div>
    </section>
  );
};

export default FeaturesSection;
