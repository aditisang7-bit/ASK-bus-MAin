import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { insforge } from "@/integrations/insforge/client";
import { useAuth } from "@/hooks/useAuth";
import { usePlan } from "@/hooks/usePlan";
import DashboardLayout from "@/components/DashboardLayout";
import UpgradeBanner from "@/components/UpgradeBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit2, Trash2, Calendar as CalIcon, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type Booking = {
  id: string;
  customer_name: string;
  service: string;
  date: string;
  time: string;
  status: string;
  notes: string | null;
};

const emptyForm = { customer_name: "", service: "", date: "", time: "", status: "pending", notes: "" };

const Bookings = () => {
  const { user } = useAuth();
  const { checkLimit, enforceLimit, incrementUsage, currentPlan } = usePlan();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [form, setForm] = useState(emptyForm);
  const bookingCheck = checkLimit("bookings");

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings").select("*").eq("user_id", user!.id).order("date", { ascending: true });
      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!user,
  });

  const upsert = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase.from("bookings").update({
          customer_name: form.customer_name,
          service: form.service,
          date: form.date,
          time: form.time,
          status: form.status,
          notes: form.notes || null,
        }).eq("id", editing.id);
        if (error) throw error;
      } else {
        if (!enforceLimit("bookings", "Bookings")) return;
        const { error } = await supabase.from("bookings").insert({
          user_id: user!.id,
          customer_name: form.customer_name,
          service: form.service,
          date: form.date,
          time: form.time,
          status: form.status,
          notes: form.notes || null,
        });
        if (error) throw error;
        await incrementUsage("bookings");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success(editing ? "Booking updated" : "Booking created");
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await insforge.database.from("bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Booking deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (b: Booking) => {
    setEditing(b);
    setForm({ customer_name: b.customer_name, service: b.service, date: b.date, time: b.time, status: b.status, notes: b.notes || "" });
    setOpen(true);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "confirmed": return "text-accent";
      case "cancelled": return "text-destructive";
      case "completed": return "text-green-400";
      default: return "text-muted-foreground";
    }
  };

  return (
    <DashboardLayout title="Bookings" subtitle="Manage appointments and scheduling">
      {!bookingCheck.allowed && (
        <UpgradeBanner resource="Bookings" current={bookingCheck.current} max={bookingCheck.max} plan={currentPlan} />
      )}
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-muted-foreground">{bookings.length} booking(s) {bookingCheck.max < Infinity && `• ${bookingCheck.current}/${bookingCheck.max} this month`}</p>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button className="hero-gradient text-primary-foreground font-semibold hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" /> Book Now
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">{editing ? "Edit Booking" : "New Booking"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); upsert.mutate(); }} className="space-y-4">
              <div>
                <Label className="text-foreground">Customer Name</Label>
                <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required className="bg-input border-border text-foreground" />
              </div>
              <div>
                <Label className="text-foreground">Service</Label>
                <Input value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} required placeholder="e.g. Character Design" className="bg-input border-border text-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-foreground">Date</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required className="bg-input border-border text-foreground" />
                </div>
                <div>
                  <Label className="text-foreground">Time</Label>
                  <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} required className="bg-input border-border text-foreground" />
                </div>
              </div>
              <div>
                <Label className="text-foreground">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="bg-input border-border text-foreground"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-foreground">Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-input border-border text-foreground" />
              </div>
              <Button type="submit" disabled={upsert.isPending} className="w-full hero-gradient text-primary-foreground font-semibold">
                {upsert.isPending ? "Saving..." : editing ? "Update" : "Create Booking"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 glass-card rounded-xl animate-pulse" />)}</div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <CalIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No bookings yet. Click "Book Now" to create one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <div key={b.id} className="glass-card rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground truncate">{b.customer_name}</h3>
                  <span className={`text-xs font-medium capitalize ${statusColor(b.status)}`}>{b.status}</span>
                </div>
                <p className="text-sm text-muted-foreground">{b.service} • {format(new Date(b.date), "MMM d, yyyy")} at {b.time}</p>
                {b.notes && <p className="text-xs text-muted-foreground mt-1">{b.notes}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => {
                  const msg = encodeURIComponent(`Hi ${b.customer_name}, reminder for your ${b.service} appointment on ${format(new Date(b.date), "MMM d, yyyy")} at ${b.time}. See you soon!`);
                  window.open(`https://wa.me/?text=${msg}`, "_blank");
                }} className="border-border text-accent hover:bg-accent/10">
                  <MessageSquare className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => openEdit(b)} className="border-border text-foreground hover:bg-secondary">
                  <Edit2 className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => deleteMutation.mutate(b.id)} className="border-border text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default Bookings;
