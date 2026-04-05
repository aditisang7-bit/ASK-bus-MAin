import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { insforge } from "@/integrations/insforge/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Save, User, MapPin, Phone, Mail, QrCode } from "lucide-react";
import { toast } from "sonner";

const defaultProfile = {
  business_name: "",
  owner_name: "",
  gst_number: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  phone: "",
  email: "",
  upi_id: "",
};

const BusinessSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(defaultProfile);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["business-profile"],
    queryFn: async () => {
      const { data, error } = await insforge.database
        .from("business_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        business_name: profile.business_name || "",
        owner_name: profile.owner_name || "",
        gst_number: profile.gst_number || "",
        address: profile.address || "",
        city: profile.city || "",
        state: profile.state || "",
        pincode: profile.pincode || "",
        phone: profile.phone || "",
        email: profile.email || "",
        upi_id: profile.upi_id || "",
      });
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      if (profile) {
        const { error } = await insforge.database
          .from("business_profiles")
          .update([form])
          .eq("user_id", user!.id);
        if (error) throw error;
      } else {
        const { error } = await insforge.database
          .from("business_profiles")
          .insert([{ ...form, user_id: user!.id }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-profile"] });
      toast.success("Business profile saved!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  if (isLoading) {
    return (
      <DashboardLayout title="Business Settings" subtitle="Configure your business profile">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 glass-card rounded-xl animate-pulse" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Business Settings" subtitle="Configure your business profile for invoices">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="max-w-2xl space-y-6"
      >
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-foreground flex items-center gap-2 text-base">
              <Building2 className="w-4 h-4 text-accent" /> Business Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-foreground text-xs">Business Name</Label>
                <Input value={form.business_name} onChange={(e) => update("business_name", e.target.value)} placeholder="Your Business Pvt Ltd" className="bg-input border-border text-foreground" />
              </div>
              <div>
                <Label className="text-foreground text-xs">Owner Name</Label>
                <Input value={form.owner_name} onChange={(e) => update("owner_name", e.target.value)} placeholder="Full Name" className="bg-input border-border text-foreground" />
              </div>
            </div>
            <div>
              <Label className="text-foreground text-xs">GST Number (optional)</Label>
              <Input value={form.gst_number} onChange={(e) => update("gst_number", e.target.value)} placeholder="22AAAAA0000A1Z5" className="bg-input border-border text-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-foreground flex items-center gap-2 text-base">
              <MapPin className="w-4 h-4 text-accent" /> Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-foreground text-xs">Street Address</Label>
              <Input value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="123, Main Street" className="bg-input border-border text-foreground" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-foreground text-xs">City</Label>
                <Input value={form.city} onChange={(e) => update("city", e.target.value)} className="bg-input border-border text-foreground" />
              </div>
              <div>
                <Label className="text-foreground text-xs">State</Label>
                <Input value={form.state} onChange={(e) => update("state", e.target.value)} className="bg-input border-border text-foreground" />
              </div>
              <div>
                <Label className="text-foreground text-xs">Pincode</Label>
                <Input value={form.pincode} onChange={(e) => update("pincode", e.target.value)} className="bg-input border-border text-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-foreground flex items-center gap-2 text-base">
              <Phone className="w-4 h-4 text-accent" /> Contact & Payments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-foreground text-xs">Phone</Label>
                <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+91 9876543210" className="bg-input border-border text-foreground" />
              </div>
              <div>
                <Label className="text-foreground text-xs">Email</Label>
                <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@business.com" className="bg-input border-border text-foreground" />
              </div>
            </div>
            <div>
              <Label className="text-foreground text-xs flex items-center gap-1">
                <QrCode className="w-3 h-3" /> UPI ID (for QR code on invoices)
              </Label>
              <Input value={form.upi_id} onChange={(e) => update("upi_id", e.target.value)} placeholder="yourbusiness@upi" className="bg-input border-border text-foreground" />
              <p className="text-[10px] text-muted-foreground mt-1">This UPI ID will appear as a QR code on your invoices for instant payment</p>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={save.isPending} className="w-full hero-gradient text-primary-foreground font-semibold hover:opacity-90">
          <Save className="w-4 h-4 mr-2" />
          {save.isPending ? "Saving..." : "Save Business Profile"}
        </Button>
      </form>
    </DashboardLayout>
  );
};

export default BusinessSettings;
