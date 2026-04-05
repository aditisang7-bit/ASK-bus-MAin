import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { insforge } from "@/integrations/insforge/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit2, Trash2, Package as PkgIcon, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type Item = { id: string; name: string; quantity: number; price: number; description: string | null; low_stock_threshold: number };
const emptyForm = { name: "", quantity: 0, price: 0, description: "", low_stock_threshold: 5 };

const Inventory = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const { data, error } = await insforge.database.from("inventory").select("*").eq("user_id", user!.id).order("name");
      if (error) throw error;
      return data as Item[];
    },
    enabled: !!user,
  });

  const upsert = useMutation({
    mutationFn: async () => {
      const payload = { name: form.name, quantity: form.quantity, price: form.price, description: form.description || null, low_stock_threshold: form.low_stock_threshold };
      if (editing) {
        const { error } = await insforge.database.from("inventory").update([{ ...payload, user_id: user!.id }]).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await insforge.database.from("inventory").insert([{ ...payload, user_id: user!.id }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success(editing ? "Item updated" : "Item added");
      setOpen(false); setEditing(null); setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await insforge.database.from("inventory").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["inventory"] }); toast.success("Item deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (item: Item) => {
    setEditing(item);
    setForm({ name: item.name, quantity: item.quantity, price: Number(item.price), description: item.description || "", low_stock_threshold: item.low_stock_threshold });
    setOpen(true);
  };

  return (
    <DashboardLayout title="Inventory" subtitle="Track products and stock levels">
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-muted-foreground">{items.length} item(s) • {items.filter(i => i.quantity <= i.low_stock_threshold).length} low stock</p>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button className="hero-gradient text-primary-foreground font-semibold hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" /> Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">{editing ? "Edit Item" : "New Item"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); upsert.mutate(); }} className="space-y-4">
              <div>
                <Label className="text-foreground">Item Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="bg-input border-border text-foreground" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-foreground">Quantity</Label>
                  <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} min={0} className="bg-input border-border text-foreground" />
                </div>
                <div>
                  <Label className="text-foreground">Price (₹)</Label>
                  <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} min={0} step="0.01" className="bg-input border-border text-foreground" />
                </div>
                <div>
                  <Label className="text-foreground">Low Stock At</Label>
                  <Input type="number" value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: Number(e.target.value) })} min={0} className="bg-input border-border text-foreground" />
                </div>
              </div>
              <div>
                <Label className="text-foreground">Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-input border-border text-foreground" />
              </div>
              <Button type="submit" disabled={upsert.isPending} className="w-full hero-gradient text-primary-foreground font-semibold">
                {upsert.isPending ? "Saving..." : editing ? "Update" : "Add Item"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 glass-card rounded-xl animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <PkgIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No inventory items. Click "Add Item" to start tracking.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="glass-card rounded-xl p-4">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-foreground">{item.name}</h3>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(item)} className="text-muted-foreground hover:text-foreground h-7 w-7 p-0">
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(item.id)} className="text-destructive h-7 w-7 p-0">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {item.description && <p className="text-xs text-muted-foreground mb-3">{item.description}</p>}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${item.quantity <= item.low_stock_threshold ? "text-destructive" : "text-foreground"}`}>
                    {item.quantity} in stock
                  </span>
                  {item.quantity <= item.low_stock_threshold && <AlertTriangle className="w-3 h-3 text-destructive" />}
                </div>
                <span className="text-sm text-accent font-medium">₹{Number(item.price).toLocaleString("en-IN")}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default Inventory;
