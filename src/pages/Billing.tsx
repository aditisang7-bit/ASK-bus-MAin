import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { insforge } from "@/integrations/insforge/client";
import { useAuth } from "@/hooks/useAuth";
import { usePlan, PLAN_PRICES, PLAN_DISPLAY_NAMES, type PlanName } from "@/hooks/usePlan";
import DashboardLayout from "@/components/DashboardLayout";
import InvoiceView from "@/components/billing/InvoiceView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, FileText, MessageSquare, Eye, CheckCircle2, Clock, XCircle, Download, Crown, Star, Check, Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

declare global {
  interface Window {
    Razorpay: any;
  }
}

type InvoiceItem = { description: string; quantity: number; unit_price: number };

const emptyForm = {
  customer_name: "", invoice_number: "", status: "draft" as string, tax_rate: 18, due_date: "", notes: "",
  items: [{ description: "", quantity: 1, unit_price: 0 }] as InvoiceItem[],
};

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const upgradePlans: { name: string; key: PlanName; price: { monthly: number; yearly: number }; features: string[] }[] = [
  {
    name: "Starter",
    key: "starter",
    price: { monthly: 299, yearly: 2999 },
    features: ["100 bookings/mo", "200 customers", "CRM access", "500 WhatsApp/mo", "200 emails/mo"],
  },
  {
    name: "Growth",
    key: "growth",
    price: { monthly: 999, yearly: 9999 },
    features: ["Unlimited bookings", "Full Inventory", "Team (3 members)", "2,000 WhatsApp/mo", "1,000 emails/mo"],
  },
  {
    name: "Pro",
    key: "pro",
    price: { monthly: 2499, yearly: 24999 },
    features: ["AI features", "Team (10 members)", "10,000 WhatsApp/mo", "5,000 emails/mo", "White-label branding"],
  },
];

const Billing = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { currentPlan, subscription, isExpired, isTrial, limits, getUsage, checkLimit } = usePlan();
  const [open, setOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<any>(null);
  const [viewItems, setViewItems] = useState<any[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [upgradeYearly, setUpgradeYearly] = useState(false);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await insforge.database.from("invoices").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const getInvoiceStatus = (inv: any) => {
    if (inv.status === "paid" || inv.status === "cancelled") return inv.status;
    if (inv.due_date && new Date(inv.due_date) < new Date() && inv.status !== "paid") return "overdue";
    return inv.status;
  };

  const filtered = statusFilter === "all" ? invoices :
    statusFilter === "overdue" ? invoices.filter((i) => getInvoiceStatus(i) === "overdue") :
    invoices.filter((i) => i.status === statusFilter);

  const addItem = () => setForm({ ...form, items: [...form.items, { description: "", quantity: 1, unit_price: 0 }] });
  const removeItem = (i: number) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });
  const updateItem = (i: number, field: keyof InvoiceItem, value: any) => {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: value };
    setForm({ ...form, items });
  };

  const subtotal = form.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const taxAmount = subtotal * (form.tax_rate / 100);
  const total = subtotal + taxAmount;

  const create = useMutation({
    mutationFn: async () => {
      const { data: invoice, error } = await insforge.database.from("invoices").insert([{
        user_id: user!.id, customer_name: form.customer_name,
        invoice_number: form.invoice_number || `INV-${Date.now()}`,
        status: form.status, subtotal, tax_rate: form.tax_rate, tax_amount: taxAmount, total,
        due_date: form.due_date || null, notes: form.notes || null,
      }]);
      if (error) throw error;
      const invId = (invoice as any)[0].id;
      const items = form.items.filter((i) => i.description).map((i) => ({
        invoice_id: invId, description: i.description, quantity: i.quantity,
        unit_price: i.unit_price, total: i.quantity * i.unit_price,
      }));
      if (items.length > 0) {
        const { error: ie } = await insforge.database.from("invoice_items").insert(items);
        if (ie) throw ie;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice created");
      setOpen(false);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await insforge.database.from("invoices").update([{ status }]).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Status updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await insforge.database.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openInvoiceView = async (inv: any) => {
    const { data } = await insforge.database.from("invoice_items").select("*").eq("invoice_id", inv.id);
    setViewItems(data || []);
    setViewInvoice(inv);
  };

  const printInvoice = () => {
    const el = document.getElementById("invoice-print");
    if (!el) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Invoice</title><style>body{font-family:system-ui,sans-serif;padding:40px;color:#333}table{width:100%;border-collapse:collapse}th,td{padding:8px;text-align:left;border-bottom:1px solid #eee}th{background:#f9f9f9}</style></head><body>${el.innerHTML}</body></html>`);
    w.document.close();
    w.print();
  };

  const handleUpgrade = async (planKey: string) => {
    setLoadingPlan(planKey);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Failed to load Razorpay");

      const { data, error } = await insforge.functions.invoke("subscribe", {
        body: { plan: planKey, billing_cycle: upgradeYearly ? "yearly" : "monthly" },
      });
      if (error) throw error;

      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: "ASK Business Manager",
        description: `${planKey.charAt(0).toUpperCase() + planKey.slice(1)} Plan`,
        order_id: data.order_id,
        theme: { color: "#6366f1" },
        handler: async (response: any) => {
          try {
            const verifyRes = await insforge.functions.invoke("activate-subscription", {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan: planKey,
                billing_cycle: upgradeYearly ? "yearly" : "monthly",
              },
            });
            if (verifyRes.error || !verifyRes.data?.verified) {
              toast.error("Payment verification failed");
            } else {
              toast.success(`🎉 ${planKey.charAt(0).toUpperCase() + planKey.slice(1)} plan activated!`);
              queryClient.invalidateQueries({ queryKey: ["subscription"] });
            }
          } catch {
            toast.error("Subscription activation error");
          }
        },
        modal: { ondismiss: () => setLoadingPlan(null) },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp: any) => {
        toast.error(`Payment failed: ${resp.error.description}`);
        setLoadingPlan(null);
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || "Upgrade error");
    } finally {
      setLoadingPlan(null);
    }
  };




  const statusIcon = (s: string) => {
    switch (s) {
      case "paid": return <CheckCircle2 className="w-3 h-3 text-green-400" />;
      case "sent": return <Clock className="w-3 h-3 text-accent" />;
      case "overdue": return <XCircle className="w-3 h-3 text-destructive" />;
      case "cancelled": return <XCircle className="w-3 h-3 text-destructive" />;
      default: return <FileText className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const paidTotal = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.total), 0);
  const pendingTotal = invoices.filter((i) => i.status !== "paid" && i.status !== "cancelled").reduce((s, i) => s + Number(i.total), 0);

  const usageStats = [
    { label: "Bookings", resource: "bookings" as const },
    { label: "Customers", resource: "customers" as const },
    { label: "WhatsApp Messages", resource: "whatsapp_messages" as const },
    { label: "Emails", resource: "emails" as const },
    { label: "AI Usage", resource: "ai_usage" as const },
  ];

  const planOrder: PlanName[] = ["free", "starter", "growth", "pro"];
  const currentPlanIndex = planOrder.indexOf(currentPlan);

  return (
    <DashboardLayout title="Billing" subtitle="Subscription, Invoices & Payments">
      <Tabs defaultValue="subscription" className="space-y-6">
        <TabsList className="bg-secondary">
          <TabsTrigger value="subscription" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Crown className="w-3 h-3 mr-1.5" /> Subscription
          </TabsTrigger>
          <TabsTrigger value="invoices" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileText className="w-3 h-3 mr-1.5" /> Invoices
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <CreditCard className="w-3 h-3 mr-1.5" /> Payment History
          </TabsTrigger>
        </TabsList>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-6">
          {/* Current Plan Card */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Crown className="w-5 h-5 text-accent" />
                  Current Plan: {PLAN_DISPLAY_NAMES[currentPlan]}
                  {isTrial && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">Trial</span>
                  )}
                  {isExpired && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">Expired</span>
                  )}
                </h3>
                {subscription && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {subscription.billing_cycle === "yearly" ? "Yearly" : "Monthly"} billing
                    {subscription.expires_at && ` • Expires ${format(new Date(subscription.expires_at), "MMM d, yyyy")}`}
                  </p>
                )}
              </div>
            </div>

            {/* Usage Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {usageStats.map((stat) => {
                const { current, max } = checkLimit(stat.resource);
                const isUnlimited = max === Infinity || max === 1;
                const percentage = isUnlimited ? 0 : max > 0 ? Math.min((current / max) * 100, 100) : 0;
                const isNearLimit = !isUnlimited && max > 0 && percentage >= 80;
                return (
                  <div key={stat.resource} className="glass-card rounded-lg p-3">
                    <p className="text-[10px] text-muted-foreground uppercase mb-1">{stat.label}</p>
                    <p className={`text-sm font-bold ${isNearLimit ? "text-destructive" : "text-foreground"}`}>
                      {current}{!isUnlimited && max > 0 ? `/${max}` : ""}
                    </p>
                    {!isUnlimited && max > 0 && (
                      <div className="mt-1.5 w-full bg-secondary rounded-full h-1">
                        <div
                          className={`h-1 rounded-full ${isNearLimit ? "bg-destructive" : "hero-gradient"}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upgrade Plans */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Upgrade Plan</h3>
              <div className="inline-flex items-center gap-2 glass-card rounded-full p-0.5">
                <button
                  onClick={() => setUpgradeYearly(false)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!upgradeYearly ? "hero-gradient text-primary-foreground" : "text-muted-foreground"}`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setUpgradeYearly(true)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${upgradeYearly ? "hero-gradient text-primary-foreground" : "text-muted-foreground"}`}
                >
                  Yearly
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {upgradePlans.map((plan) => {
                const planIndex = planOrder.indexOf(plan.key);
                const isCurrent = plan.key === currentPlan;
                const isDowngrade = planIndex <= currentPlanIndex;
                return (
                  <div key={plan.key} className={`glass-card rounded-xl p-5 flex flex-col ${isCurrent ? "ring-1 ring-accent/50" : ""}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-foreground">{plan.name}</h4>
                      {isCurrent && <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent">Current</span>}
                      {plan.key === "growth" && !isCurrent && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full hero-gradient text-primary-foreground flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5" /> Popular
                        </span>
                      )}
                    </div>
                    <div className="mb-3">
                      <span className="text-2xl font-bold text-foreground">
                        ₹{(upgradeYearly ? plan.price.yearly : plan.price.monthly).toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs text-muted-foreground">/{upgradeYearly ? "yr" : "mo"}</span>
                    </div>
                    <ul className="space-y-1.5 mb-4 flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Check className="w-3 h-3 text-accent shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      size="sm"
                      disabled={isCurrent || isDowngrade || loadingPlan === plan.key}
                      onClick={() => handleUpgrade(plan.key)}
                      className={`w-full font-semibold ${isCurrent ? "bg-secondary text-muted-foreground" : "hero-gradient text-primary-foreground hover:opacity-90"}`}
                    >
                      {loadingPlan === plan.key ? (
                        <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing</>
                      ) : isCurrent ? "Current Plan" : isDowngrade ? "Downgrade N/A" : "Upgrade"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Invoices", value: invoices.length, color: "text-foreground" },
              { label: "Paid", value: `₹${paidTotal.toLocaleString("en-IN")}`, color: "text-green-400" },
              { label: "Pending", value: `₹${pendingTotal.toLocaleString("en-IN")}`, color: "text-accent" },
              { label: "This Month", value: invoices.filter((i) => new Date(i.created_at).getMonth() === new Date().getMonth()).length, color: "text-primary" },
            ].map((s) => (
              <div key={s.label} className="glass-card rounded-xl p-4">
                <p className="text-[10px] text-muted-foreground uppercase">{s.label}</p>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* View Invoice Dialog */}
          <Dialog open={!!viewInvoice} onOpenChange={(v) => !v && setViewInvoice(null)}>
            <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-foreground flex items-center gap-2">
                  Invoice Preview
                  <Button size="sm" variant="outline" onClick={printInvoice} className="ml-auto border-border text-foreground">
                    <Download className="w-3 h-3 mr-1" /> Print / PDF
                  </Button>
                </DialogTitle>
              </DialogHeader>
              {viewInvoice && <InvoiceView invoice={viewInvoice} items={viewItems} onPaymentSuccess={() => { setViewInvoice(null); queryClient.invalidateQueries({ queryKey: ["invoices"] }); }} />}
            </DialogContent>
          </Dialog>

          {/* Action bar */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
            <div className="flex gap-2 flex-wrap">
              {["all", "draft", "sent", "paid", "overdue", "cancelled"].map((s) => (
                <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"}
                  onClick={() => setStatusFilter(s)}
                  className={statusFilter === s ? "hero-gradient text-primary-foreground" : "border-border text-foreground"}>
                  {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                </Button>
              ))}
            </div>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(emptyForm); }}>
              <DialogTrigger asChild>
                <Button className="hero-gradient text-primary-foreground font-semibold hover:opacity-90">
                  <Plus className="w-4 h-4 mr-2" /> Create Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-foreground">New Invoice</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-foreground text-xs">Customer Name</Label>
                      <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required className="bg-input border-border text-foreground" />
                    </div>
                    <div>
                      <Label className="text-foreground text-xs">Invoice #</Label>
                      <Input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} placeholder="Auto-generated" className="bg-input border-border text-foreground" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-foreground text-xs">Due Date</Label>
                      <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="bg-input border-border text-foreground" />
                    </div>
                    <div>
                      <Label className="text-foreground text-xs">Tax Rate (%)</Label>
                      <Input type="number" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: Number(e.target.value) })} className="bg-input border-border text-foreground" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-foreground text-xs">Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger className="bg-input border-border text-foreground"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-foreground text-xs">Line Items</Label>
                      <Button type="button" size="sm" variant="outline" onClick={addItem} className="border-border text-foreground text-xs">
                        <Plus className="w-3 h-3 mr-1" /> Add
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {form.items.map((item, i) => (
                        <div key={i} className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-5">
                            <Input placeholder="Description" value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} className="bg-input border-border text-foreground text-xs" />
                          </div>
                          <div className="col-span-2">
                            <Input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(i, "quantity", Number(e.target.value))} min={1} className="bg-input border-border text-foreground text-xs" />
                          </div>
                          <div className="col-span-3">
                            <Input type="number" placeholder="Price" value={item.unit_price} onChange={(e) => updateItem(i, "unit_price", Number(e.target.value))} min={0} step="0.01" className="bg-input border-border text-foreground text-xs" />
                          </div>
                          <div className="col-span-2 flex justify-end">
                            {form.items.length > 1 && (
                              <Button type="button" size="sm" variant="ghost" onClick={() => removeItem(i)} className="text-destructive">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-foreground text-xs">Notes (optional)</Label>
                    <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Payment terms, thank you note..." className="bg-input border-border text-foreground text-xs" rows={2} />
                  </div>

                  <div className="glass-card rounded-lg p-4 space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between text-xs text-muted-foreground"><span>GST ({form.tax_rate}%)</span><span>₹{taxAmount.toFixed(2)}</span></div>
                    <div className="flex justify-between text-foreground font-bold border-t border-border pt-1"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
                  </div>

                  <Button type="submit" disabled={create.isPending} className="w-full hero-gradient text-primary-foreground font-semibold">
                    {create.isPending ? "Creating..." : "Create Invoice"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Invoice List */}
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 glass-card rounded-xl animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>{statusFilter !== "all" ? `No ${statusFilter} invoices` : "No invoices yet. Create one to get started."}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((inv) => (
                <div key={inv.id} className="glass-card rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openInvoiceView(inv)}>
                    <div className="flex items-center gap-2 mb-1">
                      {statusIcon(getInvoiceStatus(inv))}
                      <h3 className="font-semibold text-foreground text-sm">{inv.invoice_number}</h3>
                      <span className={`text-[10px] font-medium capitalize ${
                        getInvoiceStatus(inv) === "paid" ? "text-green-400" :
                        getInvoiceStatus(inv) === "overdue" ? "text-destructive" :
                        "text-muted-foreground"
                      }`}>{getInvoiceStatus(inv)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{inv.customer_name} • ₹{Number(inv.total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                    <p className="text-[10px] text-muted-foreground">{format(new Date(inv.created_at), "MMM d, yyyy")}{inv.due_date ? ` • Due ${format(new Date(inv.due_date), "MMM d")}` : ""}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => openInvoiceView(inv)} className="border-border text-foreground hover:bg-secondary text-xs">
                      <Eye className="w-3 h-3 mr-1" /> View
                    </Button>
                    {inv.status !== "paid" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: inv.id, status: "paid" })} className="border-border text-green-400 hover:bg-green-500/10 text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Paid
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => {
                      const msg = encodeURIComponent(`Hi ${inv.customer_name}, invoice ${inv.invoice_number} for ₹${Number(inv.total).toLocaleString("en-IN")} is pending. Please clear at your earliest. Thank you!`);
                      window.open(`https://wa.me/?text=${msg}`, "_blank");
                    }} className="border-border text-accent hover:bg-accent/10 text-xs">
                      <MessageSquare className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => deleteMutation.mutate(inv.id)} className="border-border text-destructive hover:bg-destructive/10 text-xs">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Payment History Tab */}
        <TabsContent value="history" className="space-y-4">
          <PaymentHistory userId={user?.id} />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

const PaymentHistory = ({ userId }: { userId?: string }) => {
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payment-history", userId],
    queryFn: async () => {
      const { data, error } = await insforge.database.from("payments").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  if (isLoading) return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 glass-card rounded-xl animate-pulse" />)}</div>;

  if (payments.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p>No payment history yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {payments.map((p: any) => (
        <div key={p.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">₹{Number(p.amount).toLocaleString("en-IN")}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(p.created_at), "MMM d, yyyy")}
              {p.method ? ` • ${p.method}` : ""}
            </p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            p.status === "captured" || p.status === "paid" ? "bg-accent/10 text-accent" :
            p.status === "failed" ? "bg-destructive/10 text-destructive" :
            "bg-secondary text-muted-foreground"
          }`}>
            {p.status}
          </span>
        </div>
      ))}
    </div>
  );
};

export default Billing;
