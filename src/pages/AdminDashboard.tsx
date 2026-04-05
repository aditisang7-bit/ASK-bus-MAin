import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { insforge } from "@/integrations/insforge/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Users, Send, Plus, Tag, CreditCard, TestTube2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

const AdminDashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgForm, setMsgForm] = useState({ title: "", message: "", target_audience: "all" });
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponForm, setCouponForm] = useState({ code: "", discount_type: "percent", value: 0, expiry_date: "" });
  const [testResult, setTestResult] = useState<{ success: boolean; payment_id?: string; timestamp?: string } | null>(null);
  const [logFilter, setLogFilter] = useState("all");

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      const { data } = await insforge.database.from("user_roles").select("role").eq("user_id", user!.id).eq("role", "admin").maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const { data, error } = await insforge.functions.invoke("admin-stats");
      if (error) throw error;
      return data;
    },
    enabled: !!isAdmin,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["admin-messages"],
    queryFn: async () => {
      const { data } = await insforge.database.from("admin_messages").select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: !!isAdmin,
  });

  const { data: coupons = [] } = useQuery({
    queryKey: ["coupons"],
    queryFn: async () => {
      const { data } = await insforge.database.from("coupons").select("*").order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!isAdmin,
  });

  const { data: paymentLogs = [], refetch: refetchLogs } = useQuery({
    queryKey: ["payment-logs", logFilter],
    queryFn: async () => {
      let q = insforge.database.from("payment_logs").select("*").order("created_at", { ascending: false }).limit(50);
      if (logFilter !== "all") q = q.eq("type", logFilter);
      const { data } = await q;
      return data || [];
    },
    enabled: !!isAdmin,
  });

  const testPayment = useMutation({
    mutationFn: async () => {
      setTestResult(null);
      const { data, error } = await insforge.functions.invoke("razorpay-test-payment");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return new Promise<{ success: boolean; payment_id: string; timestamp: string }>((resolve, reject) => {
        const options = {
          key: data.key_id,
          amount: data.amount,
          currency: data.currency,
          name: "ASK Business Manager",
          description: "Admin Test Payment (₹1)",
          order_id: data.order_id,
          handler: async (response: any) => {
            try {
              const { data: verifyData, error: verifyError } = await insforge.functions.invoke("razorpay-verify", {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                },
              });
              if (verifyError || !verifyData?.verified) {
                reject(new Error("Payment verification failed"));
                return;
              }
              resolve({
                success: true,
                payment_id: response.razorpay_payment_id,
                timestamp: new Date().toISOString(),
              });
            } catch (err) {
              reject(err);
            }
          },
          modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      });
    },
    onSuccess: (result) => {
      setTestResult(result);
      toast.success("Test payment successful!");
      refetchLogs();
    },
    onError: (e: any) => {
      setTestResult({ success: false });
      toast.error(e.message || "Test payment failed");
    },
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      const { error } = await insforge.database.from("admin_messages").insert([{
        title: msgForm.title,
        message: msgForm.message,
        target_audience: msgForm.target_audience,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-messages"] });
      toast.success("Message sent");
      setMsgOpen(false);
      setMsgForm({ title: "", message: "", target_audience: "all" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createCoupon = useMutation({
    mutationFn: async () => {
      const { error } = await insforge.database.from("coupons").insert([{
        code: couponForm.code.toUpperCase(),
        discount_type: couponForm.discount_type,
        value: couponForm.value,
        expiry_date: couponForm.expiry_date || null,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      toast.success("Coupon created");
      setCouponOpen(false);
      setCouponForm({ code: "", discount_type: "percent", value: 0, expiry_date: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!isAdmin) {
    return (
      <DashboardLayout title="Admin" subtitle="Access Restricted">
        <div className="text-center py-20 text-muted-foreground">
          <p>You don't have admin access.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Admin Dashboard" subtitle="Platform overview & management">
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-secondary">
          <TabsTrigger value="overview"><BarChart3 className="w-3 h-3 mr-1.5" /> Overview</TabsTrigger>
          <TabsTrigger value="users"><Users className="w-3 h-3 mr-1.5" /> Users</TabsTrigger>
          <TabsTrigger value="messages"><Send className="w-3 h-3 mr-1.5" /> Messages</TabsTrigger>
          <TabsTrigger value="coupons"><Tag className="w-3 h-3 mr-1.5" /> Coupons</TabsTrigger>
          <TabsTrigger value="payments"><CreditCard className="w-3 h-3 mr-1.5" /> Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Users", value: stats?.total_users ?? "—" },
              { label: "Active Subs", value: stats?.active_subs ?? "—" },
              { label: "Trial Users", value: stats?.trial_users ?? "—" },
              { label: "Revenue", value: stats?.total_revenue ? `₹${Number(stats.total_revenue).toLocaleString("en-IN")}` : "—" },
            ].map((s) => (
              <div key={s.label} className="glass-card rounded-xl p-5">
                <p className="text-[10px] text-muted-foreground uppercase">{s.label}</p>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
              </div>
            ))}
          </div>

          {stats?.plan_distribution && (
            <div className="glass-card rounded-xl p-5">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Plan Distribution</h3>
              <div className="space-y-2">
                {Object.entries(stats.plan_distribution as Record<string, number>).map(([plan, count]) => (
                  <div key={plan} className="flex items-center justify-between">
                    <span className="text-sm text-foreground capitalize">{plan}</span>
                    <span className="text-sm font-bold text-foreground">{count as number}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-4">All Users</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(stats?.users || []).map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell className="text-foreground text-xs">{u.email}</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize text-xs">{u.plan}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={u.status === "active" ? "default" : u.status === "trial" ? "secondary" : "destructive"} className="text-xs capitalize">
                        {u.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground capitalize">{u.billing_cycle}</TableCell>
                    <TableCell className="text-xs text-foreground">{u.amount > 0 ? `₹${u.amount}` : "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{u.expires_at ? new Date(u.expires_at).toLocaleDateString() : "—"}</TableCell>
                  </TableRow>
                ))}
                {(!stats?.users || stats.users.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No users found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={msgOpen} onOpenChange={setMsgOpen}>
              <DialogTrigger asChild>
                <Button className="hero-gradient text-primary-foreground font-semibold">
                  <Plus className="w-4 h-4 mr-2" /> Send Message
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader><DialogTitle className="text-foreground">Broadcast Message</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); sendMessage.mutate(); }} className="space-y-4">
                  <div>
                    <Label className="text-foreground">Title</Label>
                    <Input value={msgForm.title} onChange={(e) => setMsgForm({ ...msgForm, title: e.target.value })} required className="bg-input border-border text-foreground" />
                  </div>
                  <div>
                    <Label className="text-foreground">Message</Label>
                    <Textarea value={msgForm.message} onChange={(e) => setMsgForm({ ...msgForm, message: e.target.value })} required className="bg-input border-border text-foreground" />
                  </div>
                  <div>
                    <Label className="text-foreground">Target</Label>
                    <Select value={msgForm.target_audience} onValueChange={(v) => setMsgForm({ ...msgForm, target_audience: v })}>
                      <SelectTrigger className="bg-input border-border text-foreground"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="paid">Paid Users</SelectItem>
                        <SelectItem value="trial">Trial Users</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" disabled={sendMessage.isPending} className="w-full hero-gradient text-primary-foreground font-semibold">
                    {sendMessage.isPending ? "Sending..." : "Send"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-3">
            {messages.map((m: any) => (
              <div key={m.id} className="glass-card rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-foreground text-sm">{m.title}</h4>
                  <span className="text-[10px] text-muted-foreground capitalize">{m.target_audience}</span>
                </div>
                <p className="text-xs text-muted-foreground">{m.message}</p>
              </div>
            ))}
            {messages.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No messages sent yet.</p>}
          </div>
        </TabsContent>

        <TabsContent value="coupons" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={couponOpen} onOpenChange={setCouponOpen}>
              <DialogTrigger asChild>
                <Button className="hero-gradient text-primary-foreground font-semibold">
                  <Plus className="w-4 h-4 mr-2" /> Create Coupon
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader><DialogTitle className="text-foreground">New Coupon</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); createCoupon.mutate(); }} className="space-y-4">
                  <div>
                    <Label className="text-foreground">Code</Label>
                    <Input value={couponForm.code} onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value })} required className="bg-input border-border text-foreground uppercase" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-foreground">Type</Label>
                      <Select value={couponForm.discount_type} onValueChange={(v) => setCouponForm({ ...couponForm, discount_type: v })}>
                        <SelectTrigger className="bg-input border-border text-foreground"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percent">Percent</SelectItem>
                          <SelectItem value="fixed">Fixed (₹)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-foreground">Value</Label>
                      <Input type="number" value={couponForm.value} onChange={(e) => setCouponForm({ ...couponForm, value: Number(e.target.value) })} required className="bg-input border-border text-foreground" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-foreground">Expiry Date (optional)</Label>
                    <Input type="date" value={couponForm.expiry_date} onChange={(e) => setCouponForm({ ...couponForm, expiry_date: e.target.value })} className="bg-input border-border text-foreground" />
                  </div>
                  <Button type="submit" disabled={createCoupon.isPending} className="w-full hero-gradient text-primary-foreground font-semibold">
                    {createCoupon.isPending ? "Creating..." : "Create Coupon"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-3">
            {coupons.map((c: any) => (
              <div key={c.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-foreground">{c.code}</span>
                  <p className="text-xs text-muted-foreground">
                    {c.discount_type === "percent" ? `${c.value}% off` : `₹${c.value} off`}
                    {c.expiry_date ? ` • Expires ${new Date(c.expiry_date).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.active ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"}`}>
                  {c.active ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
            {coupons.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No coupons created yet.</p>}
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          {/* Test Payment Section */}
          <div className="glass-card rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">Payment System Test</h3>
            <p className="text-xs text-muted-foreground">Test a ₹1 LIVE payment to verify Razorpay integration is working.</p>
            <Button
              onClick={() => testPayment.mutate()}
              disabled={testPayment.isPending}
              className="hero-gradient text-primary-foreground font-semibold"
            >
              <TestTube2 className="w-4 h-4 mr-2" />
              {testPayment.isPending ? "Processing..." : "Test ₹1 Payment"}
            </Button>
            {testResult && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${testResult.success ? "bg-accent/10" : "bg-destructive/10"}`}>
                {testResult.success ? <CheckCircle className="w-4 h-4 text-accent" /> : <XCircle className="w-4 h-4 text-destructive" />}
                <div>
                  <p className={`text-sm font-medium ${testResult.success ? "text-accent" : "text-destructive"}`}>
                    {testResult.success ? "Payment Successful" : "Payment Failed"}
                  </p>
                  {testResult.payment_id && (
                    <p className="text-xs text-muted-foreground">ID: {testResult.payment_id} • {new Date(testResult.timestamp!).toLocaleString()}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Payment Logs */}
          <div className="glass-card rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">Payment Logs</h3>
              <Select value={logFilter} onValueChange={setLogFilter}>
                <SelectTrigger className="w-[140px] bg-input border-border text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="test">Test</SelectItem>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="subscription">Subscription</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment ID</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentLogs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium text-foreground">₹{log.amount}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize text-xs">{log.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.status === "captured" ? "default" : log.status === "created" ? "secondary" : "destructive"} className="text-xs capitalize">
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{log.razorpay_payment_id || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {paymentLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">No payment logs yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default AdminDashboard;
