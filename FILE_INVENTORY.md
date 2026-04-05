# 📦 Paywall System - Complete File Inventory

## 📂 Directory Structure

```
src/
├── lib/
│   ├── plans.ts                          # Plan definitions
│   ├── razorpay.ts                       # Payment handling
│   ├── PAYWALL_INTEGRATION.ts            # Integration guide
│   └── PAYWALL_SETUP.md                  # Setup instructions
│
├── hooks/
│   ├── useAuth.tsx                       # Enhanced with plan support (UPDATED)
│   ├── usePlanAccess.ts                  # Usage tracking & limits (NEW)
│   └── useActionGuard.ts                 # Action protection (NEW)
│
├── components/
│   ├── PlanBadge.tsx                     # Plan display badge (NEW)
│   ├── UsageBar.tsx                      # Usage progress bar (NEW)
│   ├── FeatureLock.tsx                   # Lock UI for premium features (NEW)
│   ├── UpgradeNudge.tsx                  # Upgrade suggestion at 70% (NEW)
│   ├── DashboardPlanSection.tsx          # Dashboard overview (NEW)
│   └── modals/
│       ├── UpgradeModal.tsx              # Upgrade prompt (NEW)
│       └── SignupModal.tsx               # Signup for guests (NEW)
│
└── pages/
    ├── BookingsWithPaywall.example.tsx   # Complete integration example
    └── PAYWALL_TEMPLATE.tsx              # Copy-paste template for any page

ROOT/
└── PAYWALL_IMPLEMENTATION_GUIDE.md       # Complete setup & deployment guide
```

---

## 📋 Files Created Summary

### Core System Files

| File | Purpose | Key Exports |
|------|---------|-------------|
| `lib/plans.ts` | Plan definitions & pricing | `PLANS`, `UserPlan`, `FeatureType`, `getPaidPlans()`, `getUpgradePath()` |
| `hooks/usePlanAccess.ts` | Usage tracking & access control | `usePlanAccess()` hook with `checkAccess()`, `recordUsage()`, `getUsage()` |
| `hooks/useActionGuard.ts` | Action protection & guards | `useActionGuard()` hook with `checkAndGuardAction()`, `isActionAllowed()` |
| `lib/razorpay.ts` | Payment integration | `openRazorpayCheckout()`, `createRazorpayOrder()`, `verifyPayment()` |
| `hooks/useAuth.tsx` | Auth context with plans | Already existed, UPDATED with `userPlan` and `upgradePlan()` |

### UI Components

| File | Purpose | Props |
|------|---------|-------|
| `components/modals/UpgradeModal.tsx` | Show when hitting limits | `isOpen`, `onClose`, `currentPlan`, `featureType`, `usage`, `onUpgradeClick` |
| `components/modals/SignupModal.tsx` | Guest to signup conversion | `isOpen`, `onClose`, `actionCount`, `onSignupClick` |
| `components/PlanBadge.tsx` | Display current plan | `plan`, `size` |
| `components/UsageBar.tsx` | Show usage progress | `feature`, `used`, `limit`, `showLabel`, `showPercentage` |
| `components/FeatureLock.tsx` | Lock premium features | `isLocked`, `requiredPlan`, `onUnlockClick` |
| `components/UpgradeNudge.tsx` | Show at 70% usage | `feature`, `currentPlan`, `used`, `limit`, `onUpgradeClick` |
| `components/DashboardPlanSection.tsx` | Full plan overview | `onUpgradeClick` |

### Example & Documentation

| File | Purpose |
|------|---------|
| `pages/BookingsWithPaywall.example.tsx` | Complete working example showing integration |
| `pages/PAYWALL_TEMPLATE.tsx` | Copy-paste template for any page |
| `lib/PAYWALL_INTEGRATION.ts` | Integration patterns & examples |
| `PAYWALL_IMPLEMENTATION_GUIDE.md` | Full setup & deployment guide |

---

## 🎯 What Each System Does

### 1. **Plans & Pricing** (`lib/plans.ts`)
Defines 5 tiers with usage limits:
- Guest: 2 demo actions
- Free: 10 bookings, 3 customers, 50 WhatsApp
- Starter: 100 bookings, 200 customers, 500 WhatsApp  
- Growth: Unlimited + AI tools
- Pro: Everything unlimited + premium support

**Key Functions:**
- `hasFeature(plan, feature)` - Check if feature available
- `getLimit(plan, feature)` - Get usage limit
- `getUpgradePath(currentPlan)` - Get recommended upgrades
- `formatPrice(price)` - Format in INR

### 2. **Usage Tracking** (`hooks/usePlanAccess.ts`)
Tracks usage per user, stores in database:
- `checkAccess(feature)` - Check if action allowed
- `recordUsage(feature, count)` - Log usage after action
- `getUsage(feature)` - Get current usage stats
- `upgradePlan(newPlan)` - Update user plan

### 3. **Action Guards** (`hooks/useActionGuard.ts`)
Middleware to protect actions:
- `checkAndGuardAction(config)` - Guard + track + show modals
- `isActionAllowed(feature)` - Simple boolean check
- Auto-shows signup modal for guests
- Auto-shows upgrade modal for paid limits
- Toast notifications

### 4. **Payment** (`lib/razorpay.ts`)
Handles Razorpay checkout:
- `openRazorpayCheckout()` - Open payment modal
- `verifyPayment()` - Verify & update plan
- Integrates with Supabase edge functions

### 5. **UI Components**
- **Modals**: Upgrade prompt, signup prompt
- **Badges**: Show current plan
- **Bars**: Show usage progress
- **Locks**: Gray out premium features
- **Nudges**: Encourage at 70% usage
- **Dashboard**: Complete plan overview

---

## 🔗 How They Work Together

```
User Action (click button)
    ↓
useActionGuard.checkAndGuardAction()
    ├─→ usePlanAccess.checkAccess() → Check limits
    ├─→ Show SignupModal (if guest) or UpgradeModal (if at limit)
    └─→ If allowed: Execute action → recordUsage() → Save to DB
                    ↓
              Show success toast
              Increment usage counter
              Persist to user_subscriptions table
```

```
Navigate to page with paywall
    ↓
useAuth() → Gets userPlan from auth context
    ↓
usePlanAccess() → Load usage from database
    ↓
Render components:
├─ UpgradeNudge (if >70% usage)
├─ UsageBar (show current usage)
├─ Button (disabled if at limit)
├─ FeatureLock (if premium only feature)
└─ UpgradeModal/SignupModal
```

---

## ✅ Integration Checklist by Component

### Database Layer
- [ ] Create `user_profiles` table
- [ ] Create `user_subscriptions` table
- [ ] Create `payments` table
- [ ] Set up Supabase edge functions

### Backend
- [ ] Deploy `razorpay-order` function
- [ ] Deploy `razorpay-verify` function
- [ ] Configure Razorpay API keys
- [ ] Set env variables

### Frontend - Main Pages
- [ ] Update `Dashboard.tsx` with `DashboardPlanSection`
- [ ] Update `Bookings.tsx` with action guards
- [ ] Update `CRM.tsx` with customer limits
- [ ] Update `WhatsApp.tsx` with message limits
- [ ] Update `Marketing.tsx` with AI locks
- [ ] Update `Team.tsx` with member limits

### Frontend - Auth Flow
- [ ] Update guest entry point to show `SignupModal` after 2 actions
- [ ] Create guest account initialization
- [ ] Add plan selection to signup flow
- [ ] Test auth transitions

### Testing
- [ ] Test guest mode (2 action limit)
- [ ] Test free plan (10 booking, 3 customer)
- [ ] Test starter plan
- [ ] Test upgrade flow
- [ ] Test payment with Razorpay test cards
- [ ] Test usage persistence
- [ ] Test modals display correctly

---

## 📱 Usage Examples

### Guard a Button/Action
```typescript
const handleCreate = async () => {
  await checkAndGuardAction({
    feature: "bookings",
    actionName: "Booking",
    onAllowed: async () => { /* create logic */ }
  });
};
```

### Show Usage Bar
```typescript
const usage = getUsage("bookings");
<UsageBar feature="bookings" used={usage.used} limit={usage.limit} />
```

### Lock Premium Feature
```typescript
<FeatureLock isLocked={userPlan !== "pro"} requiredPlan="pro">
  <AIMarketingCard />
</FeatureLock>
```

### Show Plan Badge
```typescript
<PlanBadge plan={userPlan} size="md" />
```

### Display Dashboard
```typescript
<DashboardPlanSection onUpgradeClick={handleUpgrade} />
```

---

## 🎨 Component Styling

All components use:
- **Tailwind CSS** for styling
- **Shadcn/ui** components (Button, Dialog, Badge, Card)
- **Lucide icons** for visual elements
- **Responsive mobile-first design**

Colors by plan:
- Guest: Gray
- Free: Blue
- Starter: Purple
- Growth: Purple → Pink gradient
- Pro: Amber → Orange gradient

---

## 📊 Data Flow

### Plan Upgrade Flow
```
User clicks "Upgrade Now"
    ↓
openRazorpayCheckout()
    ├─ Load Razorpay script
    ├─ Create order via edge function
    └─ Show checkout modal
    ↓
Payment processed by Razorpay
    ↓
Callback with payment details
    ↓
verifyPayment() via edge function
    ├─ Verify signature
    ├─ Update user_profiles.plan
    └─ Store in payments table
    ↓
useAuth.upgradePlan() updates context
    ↓
UI updates instantly
    ↓
Features unlocked
```

### Usage Tracking Flow
```
User takes action (create booking)
    ↓
checkAndGuardAction() checks limits
    ↓
✓ Within limit → Execute action
    ↓
recordUsage("bookings")
    ├─ Update local state
    └─ Save to user_subscriptions.usage_data
    ↓
getUsage() returns updated stats
    ↓
UsageBar shows new value
```

---

## 🚀 Deployment Steps

1. **Local Development**
   - All files ready to use
   - Run `npm run dev`
   - Test with local Supabase

2. **Supabase Migration**
   - Run SQL migrations for tables
   - Deploy edge functions
   - Add secrets/env vars

3. **Test Deployment**
   - Test guest → signup flow
   - Test payment with test cards
   - Verify usage tracking

4. **Production Rollout**
   - Enable on real Razorpay account
   - Monitor conversions
   - Track payment success rate

---

## 📞 Quick Reference

**Files to modify to integrate paywall:**
1. Import `useActionGuard` and `useAuth`
2. Wrap actions with `checkAndGuardAction()`
3. Add `<UpgradeModal />` component
4. Add `<SignupModal />` for guests
5. Show `UsageBar` for transparency

**Key hooks:**
- `useAuth()` - Get user & plan
- `usePlanAccess()` - Check limits
- `useActionGuard()` - Guard actions

**Key components:**
- `<UpgradeModal />` - Prompt upgrade
- `<SignupModal />` - Convert guests
- `<UsageBar />` - Show progress
- `<UpgradeNudge />` - Encourage at 70%
- `<FeatureLock />` - Lock features
- `<DashboardPlanSection />` - Overview

---

## ✨ You're All Set!

Everything is ready to integrate. Follow the `PAYWALL_IMPLEMENTATION_GUIDE.md` for step-by-step instructions.

Questions? Check the integration patterns in `lib/PAYWALL_INTEGRATION.ts` or the complete example in `BookingsWithPaywall.example.tsx`.
