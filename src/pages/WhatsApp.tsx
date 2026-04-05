import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { insforge } from "@/integrations/insforge/client";
import { useAuth } from "@/hooks/useAuth";
import { usePlan } from "@/hooks/usePlan";
import DashboardLayout from "@/components/DashboardLayout";
import UpgradeBanner from "@/components/UpgradeBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Send, Users, Zap, BarChart3, Globe } from "lucide-react";
import { toast } from "sonner";

const templates = [
  { id: "invoice", label: "Invoice Reminder", message: "Hi {name}, your invoice #{invoice} of ₹{amount} is pending. Please clear it at your earliest. Thank you! - {business}" },
  { id: "appointment", label: "Appointment Reminder", message: "Hi {name}, this is a reminder for your appointment on {date} at {time}. See you soon! - {business}" },
  { id: "payment_thanks", label: "Payment Thank You", message: "Hi {name}, we received your payment of ₹{amount}. Thank you for your business! - {business}" },
  { id: "offer", label: "Special Offer", message: "Hi {name}! 🎉 We have a special offer for you! Get {discount}% off on all services. Valid till {date}. Visit us today! - {business}" },
  { id: "custom", label: "Custom Message", message: "" },
];

const languages = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिंदी (Hindi)" },
  { value: "mr", label: "मराठी (Marathi)" },
];

const automationTriggers = [
  { id: "invoice_created", label: "Invoice Created", desc: "Send WhatsApp when a new invoice is created" },
  { id: "booking_confirmed", label: "Booking Confirmed", desc: "Send confirmation when booking is confirmed" },
  { id: "payment_due", label: "Payment Due Reminder", desc: "Send reminder before payment due date" },
  { id: "payment_received", label: "Payment Received", desc: "Send thank you after payment" },
  { id: "appointment_reminder", label: "Appointment Reminder", desc: "Send reminder before scheduled time" },
];

const WhatsApp = () => {
  const { user, isGuest } = useAuth();
  const { currentPlan, checkLimit, enforceLimit, incrementUsage, getUsage } = usePlan();
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [template, setTemplate] = useState("custom");
  const [language, setLanguage] = useState("en");
  const [automations, setAutomations] = useState<Record<string, boolean>>({});

  const whatsappCheck = checkLimit("whatsapp_messages");

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await insforge.database.from("customers").select("*").order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleTemplateChange = (value: string) => {
    setTemplate(value);
    const t = templates.find((t) => t.id === value);
    if (t && t.message) setMessage(t.message);
  };

  const handleSend = async () => {
    if (!phone) { toast.error("Enter a phone number"); return; }
    if (!message) { toast.error("Enter a message"); return; }
    if (!enforceLimit("whatsapp_messages", "WhatsApp messages")) return;

    const cleanPhone = phone.replace(/\D/g, "");
    const fullPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${fullPhone}?text=${encoded}`, "_blank");
    await incrementUsage("whatsapp_messages");
    toast.success("WhatsApp opened!");
  };

  const sendToCustomer = async (customerPhone: string, customerName: string) => {
    if (!enforceLimit("whatsapp_messages", "WhatsApp messages")) return;
    const cleanPhone = customerPhone.replace(/\D/g, "");
    const fullPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
    const msg = encodeURIComponent(`Hi ${customerName}! ${message || "How can we help you today?"}`);
    window.open(`https://wa.me/${fullPhone}?text=${msg}`, "_blank");
    await incrementUsage("whatsapp_messages");
  };

  return (
    <DashboardLayout title="WhatsApp" subtitle="Messaging, automation & templates">
      {whatsappCheck.max > 0 && whatsappCheck.current >= whatsappCheck.max * 0.8 && (
        <UpgradeBanner resource="WhatsApp Messages" current={whatsappCheck.current} max={whatsappCheck.max} plan={currentPlan} />
      )}

      <Tabs defaultValue="compose" className="space-y-6">
        <TabsList className="bg-secondary">
          <TabsTrigger value="compose" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Send className="w-3 h-3 mr-1.5" /> Compose
          </TabsTrigger>
          <TabsTrigger value="automation" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Zap className="w-3 h-3 mr-1.5" /> Automation
          </TabsTrigger>
          <TabsTrigger value="stats" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BarChart3 className="w-3 h-3 mr-1.5" /> Stats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose">
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="glass-card rounded-xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-accent" /> Compose Message
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label className="text-foreground">Phone Number</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className="bg-input border-border text-foreground" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-foreground">Template</Label>
                      <Select value={template} onValueChange={handleTemplateChange}>
                        <SelectTrigger className="bg-input border-border text-foreground"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-foreground flex items-center gap-1">
                        <Globe className="w-3 h-3" /> Language
                      </Label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger className="bg-input border-border text-foreground"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {languages.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-foreground">Message</Label>
                    <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} placeholder="Type your message..." className="bg-input border-border text-foreground" />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Messages used: {whatsappCheck.current}/{whatsappCheck.max === Infinity ? "∞" : whatsappCheck.max}</span>
                  </div>
                  <Button onClick={handleSend} className="w-full hero-gradient text-primary-foreground font-semibold">
                    <Send className="w-4 h-4 mr-2" /> Send via WhatsApp
                  </Button>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-accent" /> Quick Send to Customers
              </h3>
              {isGuest ? (
                <p className="text-sm text-muted-foreground">Sign up to see your customers here.</p>
              ) : customers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No customers yet. Add customers in CRM first.</p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {customers.filter((c) => c.phone).map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                      <div>
                        <p className="text-sm font-medium text-foreground">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.phone}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => sendToCustomer(c.phone!, c.name)} className="border-border text-accent hover:bg-accent/10">
                        <MessageSquare className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="automation">
          <div className="glass-card rounded-xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
              <Zap className="w-5 h-5 text-accent" /> Automation Triggers
            </h3>
            <p className="text-xs text-muted-foreground mb-6">Automatically send WhatsApp messages when events happen.</p>
            <div className="space-y-4">
              {automationTriggers.map((trigger) => (
                <div key={trigger.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                  <div>
                    <p className="text-sm font-medium text-foreground">{trigger.label}</p>
                    <p className="text-xs text-muted-foreground">{trigger.desc}</p>
                  </div>
                  <Switch
                    checked={automations[trigger.id] || false}
                    onCheckedChange={(checked) => {
                      if (currentPlan === "free" || currentPlan === "starter") {
                        toast.error("Upgrade to Growth or Pro to enable automation", {
                          action: { label: "Upgrade", onClick: () => window.location.href = "/#pricing" },
                        });
                        return;
                      }
                      setAutomations({ ...automations, [trigger.id]: checked });
                      toast.success(`${trigger.label} ${checked ? "enabled" : "disabled"}`);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="stats">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Messages Sent", value: getUsage("whatsapp_messages"), color: "text-accent" },
              { label: "Limit", value: whatsappCheck.max === Infinity ? "∞" : whatsappCheck.max, color: "text-foreground" },
              { label: "Remaining", value: whatsappCheck.max === Infinity ? "∞" : Math.max(0, (whatsappCheck.max as number) - whatsappCheck.current), color: "text-primary" },
              { label: "Plan", value: currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1), color: "text-accent" },
            ].map((s) => (
              <div key={s.label} className="glass-card rounded-xl p-4">
                <p className="text-[10px] text-muted-foreground uppercase">{s.label}</p>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
          <div className="glass-card rounded-xl p-6 text-center text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-sm">Detailed analytics coming soon</p>
            <p className="text-xs mt-1">Track delivery rates, read receipts & more</p>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default WhatsApp;
