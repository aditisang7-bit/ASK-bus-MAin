/**
 * COPY-PASTE TEMPLATE FOR PAYWALL INTEGRATION IN ANY PAGE
 *
 * Copy and paste this into your component, then replace [FEATURE] with:
 * - "bookings"
 * - "customers"
 * - "whatsapp"
 * - "emails"
 * - "invoices"
 * - "team"
 *
 * And [ACTION_NAME] with what the user is doing:
 * - "Booking"
 * - "Customer"
 * - "Message"
 * - "Email"
 * - etc.
 */

// ============================================================================
// IMPORT STATEMENTS
// ============================================================================

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useActionGuard } from "@/hooks/useActionGuard";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { SignupModal } from "@/components/modals/SignupModal";
import { UpgradeModal } from "@/components/modals/UpgradeModal";
import { UpgradeNudge } from "@/components/UpgradeNudge";
import { UsageBar } from "@/components/UsageBar";
import { FeatureLock } from "@/components/FeatureLock";
import type { FeatureType } from "@/lib/plans";

// ============================================================================
// COMPONENT TEMPLATE
// ============================================================================

export function YourPageComponent() {
  // 1. Get auth and plan info
  const { user, userPlan, isGuest } = useAuth();
  
  // 2. Get action guard for paywall
  const {
    checkAndGuardAction,
    showSignupModal,
    setShowSignupModal,
    showUpgradeModal,
    setShowUpgradeModal,
  } = useActionGuard();

  // 3. Get usage tracking
  const { getUsage } = usePlanAccess();

  // 4. Define which feature this page uses
  const FEATURE_TYPE: FeatureType = "[FEATURE]"; // e.g., "bookings"
  const ACTION_NAME = "[ACTION_NAME]"; // e.g., "Booking"

  // 5. Get current usage
  const usage = getUsage(FEATURE_TYPE);
  const canPerformAction = usage.remaining > 0;

  // ========================================================================
  // HANDLER FOR CREATING/EDITING ITEMS
  // ========================================================================

  const handleCreateItem = async () => {
    // This automatically guards the action
    // Shows signup modal for guests
    // Shows upgrade modal for users at limit
    // Tracks usage on success
    await checkAndGuardAction({
      feature: FEATURE_TYPE,
      actionName: ACTION_NAME,
      onAllowed: async () => {
        // YOUR ACTUAL LOGIC HERE
        // Example:
        // await supabase.from("items").insert({ ... });
        // queryClient.invalidateQueries({ queryKey: ["items"] });
      },
    });
  };

  // ========================================================================
  // LOCK PREMIUM FEATURES
  // ========================================================================

  const isFeatureLocked = userPlan === "free" || userPlan === "guest";

  // ========================================================================
  // JSX RENDERING
  // ========================================================================

  return (
    <div className="space-y-6">
      {/* ===== USAGE UPGRADE NUDGE (At 70% usage) ===== */}
      {usage.isLimited && (
        <UpgradeNudge
          feature={FEATURE_TYPE}
          currentPlan={userPlan}
          used={usage.used}
          limit={usage.limit}
          onUpgradeClick={() => setShowUpgradeModal(true)}
        />
      )}

      {/* ===== USAGE PROGRESS BAR ===== */}
      <div className="bg-white p-4 rounded-lg border">
        <UsageBar
          feature={FEATURE_TYPE}
          used={usage.used}
          limit={usage.limit}
          showLabel={true}
          showPercentage={true}
        />
      </div>

      {/* ===== HEADER WITH CREATE BUTTON ===== */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">[PAGE_TITLE]</h1>
        <button
          onClick={handleCreateItem}
          disabled={!canPerformAction}
          className={`px-4 py-2 rounded ${
            canPerformAction
              ? "bg-blue-600 text-white cursor-pointer hover:bg-blue-700"
              : "bg-gray-300 text-gray-600 cursor-not-allowed opacity-50"
          }`}
        >
          {canPerformAction ? `+ New ${ACTION_NAME}` : "Limit Reached"}
        </button>
      </div>

      {/* ===== LOCK PREMIUM FEATURES ===== */}
      <FeatureLock
        isLocked={isFeatureLocked}
        requiredPlan="growth"
        onUnlockClick={() => setShowUpgradeModal(true)}
      >
        <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
          <h3 className="font-semibold text-purple-900">✨ Premium Feature</h3>
          <p className="text-sm text-purple-700">This feature is available in Growth plan and above.</p>
        </div>
      </FeatureLock>

      {/* ===== MAIN CONTENT ===== */}
      <div>
        {/* Your page content here */}
      </div>

      {/* ===== MODALS ===== */}

      {/* Signup modal for guests */}
      <SignupModal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
      />

      {/* Upgrade modal for limit reached */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentPlan={userPlan}
        featureType={FEATURE_TYPE}
        usage={usage}
        onUpgradeClick={(plan) => {
          // TODO: Handle payment
          console.log("Upgrade to:", plan);
        }}
      />
    </div>
  );
}

// ============================================================================
// MULTIPLE FEATURE EXAMPLE
// ============================================================================

/**
 * If your page handles multiple features (e.g., add customer AND send email):
 */
export function PageWithMultipleFeatures() {
  const { userPlan } = useAuth();
  const { checkAndGuardAction, showUpgradeModal, setShowUpgradeModal } =
    useActionGuard();
  const { getUsage } = usePlanAccess();

  const customerUsage = getUsage("customers");
  const emailUsage = getUsage("emails");

  const handleAddCustomer = async () => {
    await checkAndGuardAction({
      feature: "customers",
      actionName: "Customer",
      onAllowed: async () => {
        // Add customer logic
      },
    });
  };

  const handleSendEmail = async () => {
    await checkAndGuardAction({
      feature: "emails",
      actionName: "Email",
      onAllowed: async () => {
        // Send email logic
      },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <UsageBar feature="customers" {...customerUsage} />
      </div>
      <div>
        <UsageBar feature="emails" {...emailUsage} />
      </div>

      <button onClick={handleAddCustomer}>Add Customer</button>
      <button onClick={handleSendEmail}>Send Email</button>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentPlan={userPlan}
      />
    </div>
  );
}

// ============================================================================
// SIMPLE CONDITIONAL RENDER PATTERN
// ============================================================================

/**
 * If you just want to show/hide content based on plan:
 */
export function ConditionalFeatureRender() {
  const { userPlan } = useAuth();
  const isPro = userPlan === "pro";
  const isGrowth = userPlan === "growth" || userPlan === "pro";
  const isStarterOrAbove = userPlan !== "free" && userPlan !== "guest";

  return (
    <div>
      {isGrowth && <AIMarketingTools />}
      {isPro && <CustomBranding />}
      {isStarterOrAbove && <EmailCampaigns />}
    </div>
  );
}

// ============================================================================
// QUICK REFERENCE - FEATURE TYPES
// ============================================================================

/* 
Available features to guard:
- "bookings"           // booking limit
- "customers"          // customer limit
- "whatsapp"           // WhatsApp message limit
- "emails"             // Email sending limit
- "invoices"           // Invoice creation
- "team"               // Team members
- "ai_marketing"       // AI marketing tools
- "analytics"          // Advanced analytics
- "branding"           // Custom branding
- "priority_support"   // Priority support
*/

// ============================================================================
// QUICK REFERENCE - PLAN HIERARCHY
// ============================================================================

/*
Plans (lowest to highest):
1. guest    - 2 demo actions
2. free     - ₹0
3. starter  - ₹199/month
4. growth   - ₹499/month (MOST POPULAR - has AI tools)
5. pro      - ₹999/month (ALL FEATURES)

To check if user has a feature:
- AI tools: only "growth" and "pro"
- Analytics: only "growth" and "pro"
- Branding: only "pro"
- Unlimited bookings: "growth" and "pro"
*/

