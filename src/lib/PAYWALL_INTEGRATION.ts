/**
 * PAYWALL INTEGRATION GUIDE
 *
 * This guide shows how to integrate the paywall system across the ASK Business Manager app.
 *
 * ==================== CORE COMPONENTS ====================
 *
 * 1. HOOKS TO USE:
 *    - useAuth() - Get current user, plan, login state
 *    - usePlanAccess() - Check limits, record usage
 *    - useActionGuard() - Guard actions with paywall
 *
 * 2. TYPES AVAILABLE:
 *    - UserPlan: "guest" | "free" | "starter" | "growth" | "pro"
 *    - FeatureType: "bookings" | "customers" | "whatsapp" | "emails" | "invoices" | "team" | ...
 *
 * ==================== INTEGRATION PATTERNS ====================
 *
 * PATTERN 1: Guarding Button/Action
 * ================================
 * 
 * import { useActionGuard } from "@/hooks/useActionGuard";
 * import { SignupModal } from "@/components/modals/SignupModal";
 * import { UpgradeModal } from "@/components/modals/UpgradeModal";
 * 
 * export function BookingsPage() {
 *   const { checkAndGuardAction, showUpgradeModal, setShowUpgradeModal } = useActionGuard();
 *   
 *   const handleCreateBooking = async () => {
 *     const allowed = await checkAndGuardAction({
 *       feature: "bookings",
 *       actionName: "Booking",
 *       onAllowed: async () => {
 *         // Your actual booking creation logic
 *         await createBooking();
 *       },
 *     });
 *   };
 *
 *   return (
 *     <>
 *       <button onClick={handleCreateBooking}>Create Booking</button>
 *       <UpgradeModal
 *         isOpen={showUpgradeModal}
 *         onClose={() => setShowUpgradeModal(false)}
 *         currentPlan={userPlan}
 *       />
 *     </>
 *   );
 * }
 *
 *
 * PATTERN 2: Feature Lock UI
 * ===========================
 *
 * import { useAuth } from "@/hooks/useAuth";
 * import { FeatureLock } from "@/components/FeatureLock";
 * import { AIMarketingCard } from "@/components/AIMarketingCard";
 *
 * export function MarketingPage() {
 *   const { userPlan } = useAuth();
 *   const isLocked = userPlan === "free"; // Only Pro has AI
 *
 *   return (
 *     <FeatureLock 
 *       isLocked={isLocked}
 *       requiredPlan="pro"
 *       onUnlockClick={() => showUpgradeModal()}
 *     >
 *       <AIMarketingCard />
 *     </FeatureLock>
 *   );
 * }
 *
 *
 * PATTERN 3: Usage Progress Check
 * ================================
 *
 * import { usePlanAccess } from "@/hooks/usePlanAccess";
 * import { UpgradeNudge } from "@/components/UpgradeNudge";
 *
 * export function CRMPage() {
 *   const { userPlan } = useAuth();
 *   const { getUsage } = usePlanAccess();
 *   const customerUsage = getUsage("customers");
 *
 *   return (
 *     <>
 *       {customerUsage.isLimited && (
 *         <UpgradeNudge
 *           feature="customers"
 *           currentPlan={userPlan}
 *           used={customerUsage.used}
 *           limit={customerUsage.limit}
 *           onUpgradeClick={() => showUpgradeModal()}
 *         />
 *       )}
 *       {/* CRM content */}
 *     </>
 *   );
 * }
 *
 *
 * PATTERN 4: Dashboard Integration
 * =================================
 *
 * import { DashboardPlanSection } from "@/components/DashboardPlanSection";
 *
 * export function Dashboard() {
 *   return (
 *     <>
 *       <h1>Dashboard</h1>
 *       <DashboardPlanSection />
 *       {/* Other dashboard content */}
 *     </>
 *   );
 * }
 *
 *
 * ==================== PAYMENT INTEGRATION ====================
 *
 * When user clicks "Upgrade Now":
 *
 * import { openRazorpayCheckout } from "@/lib/razorpay";
 *
 * const handleUpgrade = async (planId: UserPlan) => {
 *   try {
 *     await openRazorpayCheckout(
 *       {
 *         planId,
 *         userId: user.id,
 *         email: user.email,
 *         userName: user.user_metadata?.name,
 *       },
 *       async (response) => {
 *         // Success - verify and update plan
 *         const verified = await verifyPayment(response, planId, user.id);
 *         if (verified) {
 *           await upgradePlan(planId); // Update context
 *           showSuccessMessage("Plan upgraded!");
 *         }
 *       },
 *       (error) => {
 *         console.error("Payment failed:", error);
 *       }
 *     );
 *   } catch (err) {
 *     console.error("Error:", err);
 *   }
 * };
 *
 *
 * ==================== COMPONENTS TO IMPORT ====================
 *
 * Modals:
 * - UpgradeModal - Show when feature limit reached
 * - SignupModal - Show when guest reaches limit
 *
 * UI Components:
 * - PlanBadge - Display current plan
 * - UsageBar - Show usage progress for a feature
 * - FeatureLock - Lock premium features
 * - UpgradeNudge - Show upgrade suggestion at 70% usage
 * - DashboardPlanSection - Full plan overview
 *
 *
 * ==================== PAGES TO UPDATE ====================
 *
 * 1. Bookings.tsx - Guard create/edit booking
 * 2. CRM.tsx - Guard add customer
 * 3. WhatsApp.tsx - Guard send message
 * 4. Marketing.tsx - Lock AI features
 * 5. Team.tsx - Guard add team member
 * 6. Billing.tsx - Show usage and upgrade option
 * 7. Dashboard.tsx - Add DashboardPlanSection
 * 8. AIStudio.tsx - Lock AI features for non-Pro
 *
 *
 * ==================== DATABASE SCHEMA ====================
 *
 * Required table: user_profiles
 * Fields:
 * - user_id (uuid, pk)
 * - subscription_plan ("guest" | "free" | "starter" | "growth" | "pro")
 * - subscription_status ("active" | "canceled")
 * - subscription_started_at (timestamp)
 * - subscription_ends_at (timestamp nullable)
 *
 * Required table: user_subscriptions
 * Fields:
 * - user_id (uuid, pk)
 * - plan (UserPlan)
 * - usage_data (jsonb) - { bookings: 5, customers: 2, ... }
 * - created_at (timestamp)
 * - updated_at (timestamp)
 *
 * Required table: payments
 * Fields:
 * - id (uuid, pk)
 * - user_id (uuid, fk)
 * - plan_id (UserPlan)
 * - amount (numeric)
 * - razorpay_order_id (text)
 * - razorpay_payment_id (text)
 * - status ("success" | "failed" | "pending")
 * - created_at (timestamp)
 *
 */

export const INTEGRATION_GUIDE = true;

