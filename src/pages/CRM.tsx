import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePlan } from "@/hooks/usePlan";
import DashboardLayout from "@/components/DashboardLayout";
import UpgradeBanner from "@/components/UpgradeBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit2, Trash2, UserCircle } from "lucide-react";
import { toast } from "sonner";

type Customer = { id: string; name: string; email: string | null; phone: string | null; notes: string | null; created_at: string };
const emptyForm = { name: "", email: "", phone: "", notes: "" };

const CRM = () => {
  const { user } = useAuth();
  const { checkLimit, enforceLimit, incrementUsage, currentPlan } = usePlan();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const crmCheck = checkLimit("crm");
  const customerCheck = checkLimit("customers");

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").eq("user_id", user!.id).order("name");
      if (error) throw error;
      return data as Customer[];
    },
    enabled: !!user,
  });

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const upsert = useMutation({
    mutationFn: async () => {
      const payload = { name: form.name, email: form.email || null, phone: form.phone || null, notes: form.notes || null };
      if (editing) {
        const { error } = await supabase.from("customers").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        if (!enforceLimit("customers", "Customers")) return;
        const { error } = await supabase.from("customers").insert({ ...payload, user_id: user!.id });
        if (error) throw error;
        await incrementUsage("customers");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success(editing ? "Customer updated" : "Customer added");
      setOpen(false); setEditing(null); setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["customers"] }); toast.success("Customer deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({ name: c.name, email: c.email || "", phone: c.phone || "", notes: c.notes || "" });
    setOpen(true);
  };

  return (
    <DashboardLayout title="Customer CRM" subtitle="Manage your client relationships">
      {!crmCheck.allowed && (
        <UpgradeBanner resource="CRM" current={0} max={0} plan={currentPlan} />
      )}
      {crmCheck.allowed && !customerCheck.allowed && (
        <UpgradeBanner resource="Customers" current={customerCheck.current} max={customerCheck.max} plan={currentPlan} />
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <Input placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-input border-border text-foreground max-w-xs" />
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button className="hero-gradient text-primary-foreground font-semibold hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" /> Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">{editing ? "Edit Customer" : "New Customer"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); upsert.mutate(); }} className="space-y-4">
              <div>
                <Label className="text-foreground">Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="bg-input border-border text-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-foreground">Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-input border-border text-foreground" />
                </div>
                <div>
                  <Label className="text-foreground">Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-input border-border text-foreground" />
                </div>
              </div>
              <div>
                <Label className="text-foreground">Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-input border-border text-foreground" />
              </div>
              <Button type="submit" disabled={upsert.isPending} className="w-full hero-gradient text-primary-foreground font-semibold">
                {upsert.isPending ? "Saving..." : editing ? "Update" : "Add Customer"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 glass-card rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <UserCircle className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>{customers.length === 0 ? 'No customers yet. Click "Add Customer" to start.' : "No matching customers found."}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <div key={c.id} className="glass-card rounded-xl p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-foreground">{c.name}</h3>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(c)} className="text-muted-foreground hover:text-foreground h-7 w-7 p-0">
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(c.id)} className="text-destructive h-7 w-7 p-0">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {c.email && <p className="text-sm text-muted-foreground">{c.email}</p>}
              {c.phone && <p className="text-sm text-muted-foreground">{c.phone}</p>}
              {c.notes && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{c.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default CRM;
