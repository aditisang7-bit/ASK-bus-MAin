import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { insforge } from "@/integrations/insforge/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Bell, Calendar, CreditCard, MessageSquare, Clock } from "lucide-react";
import { toast } from "sonner";
import { format, isAfter, addDays } from "date-fns";

const Reminders = () => {
  const { user, isGuest } = useAuth();

  const { data: upcomingBookings = [] } = useQuery({
    queryKey: ["upcoming-bookings"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const nextWeek = addDays(new Date(), 7).toISOString().split("T")[0];
      const { data, error } = await insforge.database
        .from("bookings")
        .select("*")
        .gte("date", today)
        .lte("date", nextWeek)
        .order("date");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: pendingInvoices = [] } = useQuery({
    queryKey: ["pending-invoices"],
    queryFn: async () => {
      const { data, error } = await insforge.database
        .from("invoices")
        .select("*")
        .in("status", ["draft", "sent"])
        .order("due_date");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const sendWhatsAppReminder = (phone: string, message: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const fullPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <DashboardLayout title="Smart Reminders" subtitle="Automated alerts for payments & appointments">
      {isGuest ? (
        <div className="text-center py-20 text-muted-foreground">
          <Bell className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Sign up to access Smart Reminders</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Upcoming Appointments */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Upcoming Appointments (Next 7 days)
            </h3>
            {upcomingBookings.length === 0 ? (
              <div className="glass-card rounded-xl p-6 text-center text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No upcoming appointments</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingBookings.map((b) => (
                  <div key={b.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{b.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{b.service} • {format(new Date(b.date), "MMM d")} at {b.time}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sendWhatsAppReminder("", `Hi ${b.customer_name}, reminder for your appointment on ${format(new Date(b.date), "MMM d, yyyy")} at ${b.time}. See you soon!`)}
                      className="border-border text-accent"
                    >
                      <MessageSquare className="w-3 h-3 mr-1" /> Remind
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Payments */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Pending Payments
            </h3>
            {pendingInvoices.length === 0 ? (
              <div className="glass-card rounded-xl p-6 text-center text-muted-foreground">
                <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No pending invoices</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingInvoices.map((inv) => (
                  <div key={inv.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{inv.customer_name} — {inv.invoice_number}</p>
                      <p className="text-xs text-muted-foreground">
                        ₹{Number(inv.total).toLocaleString("en-IN")}
                        {inv.due_date ? ` • Due ${format(new Date(inv.due_date), "MMM d")}` : ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sendWhatsAppReminder("", `Hi ${inv.customer_name}, this is a reminder for invoice ${inv.invoice_number} of ₹${Number(inv.total).toLocaleString("en-IN")}. Please clear it at your earliest. Thank you!`)}
                      className="border-border text-accent"
                    >
                      <MessageSquare className="w-3 h-3 mr-1" /> Remind
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Reminders;
