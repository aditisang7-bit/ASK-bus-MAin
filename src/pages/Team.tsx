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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type Employee = { id: string; name: string; email: string | null; phone: string | null; role: string; department: string | null; status: string; joined_date: string };
const emptyForm = { name: "", email: "", phone: "", role: "staff", department: "", status: "active", joined_date: new Date().toISOString().split("T")[0] };

const Team = () => {
  const { user } = useAuth();
  const { checkLimit, enforceLimit, incrementUsage, currentPlan } = usePlan();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState(emptyForm);
  const teamCheck = checkLimit("team");

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("*").order("name");
      if (error) throw error;
      return data as Employee[];
    },
    enabled: !!user,
  });

  const upsert = useMutation({
    mutationFn: async () => {
      const payload = { name: form.name, email: form.email || null, phone: form.phone || null, role: form.role, department: form.department || null, status: form.status, joined_date: form.joined_date };
      if (editing) {
        const { error } = await supabase.from("employees").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        if (!enforceLimit("team", "Team members")) return;
        const { error } = await supabase.from("employees").insert({ ...payload, user_id: user!.id });
        if (error) throw error;
        await incrementUsage("team");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success(editing ? "Employee updated" : "Employee added");
      setOpen(false); setEditing(null); setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["employees"] }); toast.success("Employee removed"); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (emp: Employee) => {
    setEditing(emp);
    setForm({ name: emp.name, email: emp.email || "", phone: emp.phone || "", role: emp.role, department: emp.department || "", status: emp.status, joined_date: emp.joined_date });
    setOpen(true);
  };

  return (
    <DashboardLayout title="Team" subtitle="Manage employees and roles">
      {!teamCheck.allowed && (
        <UpgradeBanner resource="Team members" current={teamCheck.current} max={teamCheck.max} plan={currentPlan} />
      )}
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-muted-foreground">{employees.length} team member(s) {teamCheck.max < Infinity && teamCheck.max > 0 && `• ${teamCheck.current}/${teamCheck.max} this month`}</p>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button className="hero-gradient text-primary-foreground font-semibold hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" /> Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">{editing ? "Edit Employee" : "New Employee"}</DialogTitle>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-foreground">Role</Label>
                  <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="bg-input border-border text-foreground" />
                </div>
                <div>
                  <Label className="text-foreground">Department</Label>
                  <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="bg-input border-border text-foreground" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-foreground">Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger className="bg-input border-border text-foreground"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-foreground">Joined Date</Label>
                  <Input type="date" value={form.joined_date} onChange={(e) => setForm({ ...form, joined_date: e.target.value })} className="bg-input border-border text-foreground" />
                </div>
              </div>
              <Button type="submit" disabled={upsert.isPending} className="w-full hero-gradient text-primary-foreground font-semibold">
                {upsert.isPending ? "Saving..." : editing ? "Update" : "Add Employee"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 glass-card rounded-xl animate-pulse" />)}</div>
      ) : employees.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No team members yet. Click "Add Employee" to start.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {employees.map((emp) => (
            <div key={emp.id} className="glass-card rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground">{emp.name}</h3>
                  <span className={`text-xs font-medium capitalize ${emp.status === "active" ? "text-green-400" : "text-muted-foreground"}`}>{emp.status}</span>
                </div>
                <p className="text-sm text-muted-foreground">{emp.role}{emp.department ? ` • ${emp.department}` : ""}</p>
                <p className="text-xs text-muted-foreground">{emp.email && `${emp.email} • `}Joined {format(new Date(emp.joined_date), "MMM d, yyyy")}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => openEdit(emp)} className="border-border text-foreground hover:bg-secondary">
                  <Edit2 className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => deleteMutation.mutate(emp.id)} className="border-border text-destructive hover:bg-destructive/10">
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

export default Team;
