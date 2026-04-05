import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { insforge } from "@/integrations/insforge/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { CreditCard, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

type InvoiceViewProps = {
  invoice: any;
  items: any[];
  onPaymentSuccess?: () => void;
};

const UpiQrCode = ({ upiId, amount, name, invoiceNumber }: { upiId: string; amount: number; name: string; invoiceNumber: string }) => {
  if (!upiId) return null;
  const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&am=${amount.toFixed(2)}&tn=${encodeURIComponent(`Invoice ${invoiceNumber}`)}&cu=INR`;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiUrl)}`;

  return (
    <div className="text-center">
      <img src={qrApiUrl} alt="UPI QR Code" className="w-[120px] h-[120px] mx-auto" />
      <p className="text-[9px] text-muted-foreground mt-1">Scan to pay via UPI</p>
      <p className="text-[8px] text-muted-foreground">{upiId}</p>
    </div>
  );
};

declare global {
  interface Window {
    Razorpay: any;
  }
}

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

const InvoiceView = ({ invoice, items, onPaymentSuccess }: InvoiceViewProps) => {
  const { user } = useAuth();
  const [paying, setPaying] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["business-profile"],
    queryFn: async () => {
      const { data } = await insforge.database.from("business_profiles").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = {
      paid: "bg-green-500/20 text-green-400",
      sent: "bg-accent/20 text-accent",
      draft: "bg-muted text-muted-foreground",
      cancelled: "bg-destructive/20 text-destructive",
      failed: "bg-destructive/20 text-destructive",
    };
    return colors[s] || colors.draft;
  };

  const handlePayNow = async () => {
    setPaying(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Failed to load Razorpay SDK");

      const { data: userAuth } = await insforge.auth.getCurrentUser();
      const token = userAuth?.user?.id; // Or whatever token is needed, but typically getCurrentUser handles it.

      const res = await insforge.functions.invoke("razorpay-order", {
        body: {
          invoice_id: invoice.id,
          amount: Number(invoice.total),
          customer_name: invoice.customer_name,
          customer_email: "",
        },
      });

      if (res.error) throw new Error(res.error.message || "Failed to create order");
      const orderData = res.data;

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: profile?.business_name || "ASK Business Manager",
        description: `Invoice ${invoice.invoice_number}`,
        order_id: orderData.order_id,
        prefill: {
          name: orderData.prefill?.name || invoice.customer_name,
          email: orderData.prefill?.email || "",
        },
        theme: { color: "#6366f1" },
        handler: async (response: any) => {
          try {
            const verifyRes = await insforge.functions.invoke("razorpay-verify", {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
            });

            if (verifyRes.error || !verifyRes.data?.verified) {
              toast.error("Payment verification failed. Contact support.");
            } else {
              toast.success("Payment successful! Invoice marked as paid.");
              onPaymentSuccess?.();
            }
          } catch {
            toast.error("Payment verification error");
          }
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp: any) => {
        toast.error(`Payment failed: ${resp.error.description}`);
        setPaying(false);
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || "Payment error");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div id="invoice-print" className="bg-card rounded-xl p-6 md:p-8 max-w-2xl mx-auto text-foreground text-sm print:bg-white print:text-black">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-xl font-bold tracking-tight">{profile?.business_name || "Your Business"}</h2>
          {profile?.owner_name && <p className="text-xs text-muted-foreground">{profile.owner_name}</p>}
          {profile?.address && (
            <p className="text-xs text-muted-foreground mt-1">
              {profile.address}
              {profile.city && `, ${profile.city}`}
              {profile.state && `, ${profile.state}`}
              {profile.pincode && ` - ${profile.pincode}`}
            </p>
          )}
          {profile?.phone && <p className="text-xs text-muted-foreground">📞 {profile.phone}</p>}
          {profile?.email && <p className="text-xs text-muted-foreground">✉ {profile.email}</p>}
          {profile?.gst_number && <p className="text-xs text-muted-foreground font-medium mt-1">GSTIN: {profile.gst_number}</p>}
        </div>
        <div className="text-right">
          <h3 className="text-lg font-bold text-gradient">INVOICE</h3>
          <p className="text-xs text-muted-foreground">{invoice.invoice_number}</p>
          <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full mt-1 font-medium uppercase ${statusBadge(invoice.status)}`}>
            {invoice.status}
          </span>
        </div>
      </div>

      {/* Bill To + Dates */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Bill To</p>
          <p className="font-semibold">{invoice.customer_name}</p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>Date: {format(new Date(invoice.created_at), "MMM d, yyyy")}</p>
          {invoice.due_date && <p>Due: {format(new Date(invoice.due_date), "MMM d, yyyy")}</p>}
        </div>
      </div>

      {/* Items Table */}
      <div className="border border-border rounded-lg overflow-hidden mb-6">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-secondary/50">
              <th className="text-left p-3 font-semibold">Description</th>
              <th className="text-center p-3 font-semibold w-16">Qty</th>
              <th className="text-right p-3 font-semibold w-24">Price</th>
              <th className="text-right p-3 font-semibold w-24">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-t border-border">
                <td className="p-3">{item.description}</td>
                <td className="p-3 text-center">{item.quantity}</td>
                <td className="p-3 text-right">₹{Number(item.unit_price).toFixed(2)}</td>
                <td className="p-3 text-right">₹{Number(item.total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals + QR */}
      <div className="flex justify-between items-end">
        {profile?.upi_id && invoice.status !== "paid" && (
          <UpiQrCode
            upiId={profile.upi_id}
            amount={Number(invoice.total)}
            name={profile.business_name || "Business"}
            invoiceNumber={invoice.invoice_number}
          />
        )}
        <div className={`space-y-1 text-right ${!profile?.upi_id ? "ml-auto" : ""}`}>
          <div className="flex justify-between gap-8 text-xs text-muted-foreground">
            <span>Subtotal</span>
            <span>₹{Number(invoice.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-8 text-xs text-muted-foreground">
            <span>GST ({Number(invoice.tax_rate)}%)</span>
            <span>₹{Number(invoice.tax_amount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-8 text-sm font-bold border-t border-border pt-2 mt-1">
            <span>Total</span>
            <span>₹{Number(invoice.total).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Pay Now Button */}
      {invoice.status !== "paid" && invoice.status !== "cancelled" && user && (
        <div className="mt-6 pt-4 border-t border-border">
          <Button
            onClick={handlePayNow}
            disabled={paying}
            className="w-full hero-gradient text-primary-foreground font-semibold hover:opacity-90"
          >
            {paying ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
            ) : (
              <><CreditCard className="w-4 h-4 mr-2" /> Pay ₹{Number(invoice.total).toLocaleString("en-IN", { minimumFractionDigits: 2 })} Now</>
            )}
          </Button>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Supports UPI, Cards, Net Banking & Wallets via Razorpay
          </p>
        </div>
      )}

      {invoice.status === "paid" && (
        <div className="mt-6 pt-4 border-t border-border text-center">
          <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-400 px-4 py-2 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-semibold text-sm">Payment Received</span>
          </div>
        </div>
      )}

      {invoice.notes && (
        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Notes</p>
          <p className="text-xs text-muted-foreground">{invoice.notes}</p>
        </div>
      )}

      {/* Platform branding */}
      <p className="text-[8px] text-muted-foreground text-center mt-8 opacity-50">
        Powered by ASK Business Manager
      </p>
    </div>
  );
};

export default InvoiceView;
