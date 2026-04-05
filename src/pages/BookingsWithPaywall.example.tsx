/**
 * BOOKINGS PAGE - PAYWALL INTEGRATION EXAMPLE
 *
 * This file shows how to integrate the paywall system into an existing page.
 * Replace the existing Bookings.tsx with this version to get full paywall integration.
 *
 * Key additions:
 * 1. useActionGuard() - Guard create/edit booking actions
 * 2. SignupModal - Show when guest limit reached
 * 3. UpgradeModal - Show when booking limit reached
 * 4. UpgradeNudge - Show at 70% usage
 * 5. UsageBar - Show current usage
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActionGuard } from "@/hooks/useActionGuard";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import DashboardLayout from "@/components/DashboardLayout";
import UpgradeBanner from "@/components/UpgradeBanner";
import { SignupModal } from "@/components/modals/SignupModal";
import { UpgradeModal } from "@/components/modals/UpgradeModal";
import { UpgradeNudge } from "@/components/UpgradeNudge";
import { UsageBar } from "@/components/UsageBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit2, Trash2, Calendar as CalIcon, Lock } from "lucide-react";
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

const emptyForm = {
  customer_name: "",
  service: "",
  date: "",
  time: "",
  status: "pending",
  notes: "",
};

export const BookingsPageWithPaywall = () => {
  const { user, isGuest, userPlan } = useAuth();
  const { getUsage } = usePlanAccess();
  const {
    checkAndGuardAction,
    showSignupModal,
    setShowSignupModal,
    showUpgradeModal,
    setShowUpgradeModal,
    currentFeature,
  } = useActionGuard();

  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [form, setForm] = useState(emptyForm);

  const bookingUsage = getUsage("bookings");
  const canCreateBooking = bookingUsage.remaining > 0;

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("date", { ascending: true });
      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!user,
  });

  const upsert = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase
          .from("bookings")
          .update({
            customer_name: form.customer_name,
            service: form.service,
            date: form.date,
            time: form.time,
            status: form.status,
            notes: form.notes || null,
          })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
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
      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Booking deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleCreateBooking = async () => {
    // Guard the action with paywall
    await checkAndGuardAction({
      feature: "bookings",
      actionName: "Booking",
      onAllowed: async () => {
        await upsert.mutateAsync();
      },
      onBlocked: () => {
        // Modal will be shown by useActionGuard
      },
    });
  };

  const openEdit = (b: Booking) => {
    setEditing(b);
    setForm({
      customer_name: b.customer_name,
      service: b.service,
      date: b.date,
      time: b.time,
      status: b.status,
      notes: b.notes || "",
    });
    setOpen(true);
  };

  return (
    <DashboardLayout label="Bookings">
      <div className="space-y-4">
        {/* Upgrade nudge at 70% usage */}
        {bookingUsage.isLimited && (
          <UpgradeNudge
            feature="bookings"
            currentPlan={userPlan}
            used={bookingUsage.used}
            limit={bookingUsage.limit}
            onUpgradeClick={() => setShowUpgradeModal(true)}
          />
        )}

        {/* Usage bar showing current usage */}
        <div className="bg-white p-4 rounded-lg border">
          <UsageBar
            feature="bookings"
            used={bookingUsage.used}
            limit={bookingUsage.limit}
            showLabel={true}
            showPercentage={true}
          />
        </div>

        {/* Create button with disabled state */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Bookings</h2>
          {isGuest && (
            <div className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded">
              Guest Mode - {2 - bookings.length} actions remaining
            </div>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditing(null);
                  setForm(emptyForm);
                }}
                disabled={!canCreateBooking && !editing}
                className={!canCreateBooking ? "opacity-50 cursor-not-allowed" : ""}
              >
                <Plus className="w-4 h-4" />
                {!canCreateBooking && <Lock className="w-4 h-4 ml-2" />}
                {canCreateBooking ? "New Booking" : "Limit Reached"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editing ? "Edit Booking" : "Create New Booking"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Customer Name *</Label>
                  <Input
                    value={form.customer_name}
                    onChange={(e) =>
                      setForm({ ...form, customer_name: e.target.value })
                    }
                    placeholder="Enter customer name"
                  />
                </div>
                <div>
                  <Label>Service *</Label>
                  <Input
                    value={form.service}
                    onChange={(e) =>
                      setForm({ ...form, service: e.target.value })
                    }
                    placeholder="Service offered"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Time *</Label>
                    <Input
                      type="time"
                      value={form.time}
                      onChange={(e) => setForm({ ...form, time: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Additional notes..."
                  />
                </div>
                <Button
                  onClick={handleCreateBooking}
                  className="w-full"
                  disabled={upsert.isPending}
                >
                  {editing ? "Update" : "Create"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Bookings list */}
        {isLoading ? (
          <div>Loading bookings...</div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No bookings yet. Create your first booking to get started.
          </div>
        ) : (
          <div className="grid gap-4">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-white p-4 rounded-lg border flex justify-between items-start"
              >
                <div>
                  <h3 className="font-semibold">{booking.customer_name}</h3>
                  <p className="text-sm text-gray-600">{booking.service}</p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(booking.date), "MMM dd, yyyy")} at{" "}
                    {booking.time}
                  </p>
                  <span className={`text-xs px-2 py-1 rounded mt-1 inline-block ${
                    booking.status === "completed"
                      ? "bg-green-100 text-green-800"
                      : booking.status === "confirmed"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
                  }`}>
                    {booking.status}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(booking)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteMutation.mutate(booking.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Signup modal for guests */}
      <SignupModal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        actionCount={bookings.length}
      />

      {/* Upgrade modal for limit reached */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentPlan={userPlan}
        featureType="bookings"
        usage={bookingUsage}
      />
    </DashboardLayout>
  );
};

