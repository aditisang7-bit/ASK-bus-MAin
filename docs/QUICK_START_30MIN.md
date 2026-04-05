# ⚡ Quick Start - Implement Paywall in 30 Minutes

> For developers who want to add the paywall system quickly to existing pages

## 🚀 5-Step Integration

### Step 1: Add to One Page (5 min)

Open `src/pages/CRM.tsx` (or any page):

```typescript
// ADD THESE IMPORTS AT TOP
import { useActionGuard } from "@/hooks/useActionGuard";
import { useAuth } from "@/hooks/useAuth";
import { UpgradeModal } from "@/components/modals/UpgradeModal";
import { SignupModal } from "@/components/modals/SignupModal";
import { UsageBar } from "@/components/UsageBar";

// INSIDE COMPONENT - ADD HOOKS
const { userPlan } = useAuth();
const { checkAndGuardAction, showUpgradeModal, setShowUpgradeModal, showSignupModal, setShowSignupModal } = useActionGuard();
const { getUsage } = usePlanAccess();

// GET USAGE
const usage = getUsage("customers");

// GUARD YOUR ACTION - Replace existing createCustomer function
const handleAddCustomer = async () => {
  await checkAndGuardAction({
    feature: "customers",
    actionName: "Customer",
    onAllowed: async () => {
      // YOUR EXISTING LOGIC - e.g., await createCustomer()
    }
  });
};

// ADD USAGE BAR BEFORE BUTTON
<UsageBar feature="customers" used={usage.used} limit={usage.limit} />

// DISABLE BUTTON IF AT LIMIT
<button disabled={usage.remaining <= 0}>Add Customer</button>

// ADD MODALS AT END OF COMPONENT (before closing tag)
<UpgradeModal
  isOpen={showUpgradeModal}
  onClose={() => setShowUpgradeModal(false)}
  currentPlan={userPlan}
  featureType="customers"
/>
<SignupModal
  isOpen={showSignupModal}
  onClose={() => setShowSignupModal(false)}
/>
```

**That's it! The paywall now works on this page.**

---

### Step 2: Dashboard (5 min)

Open `src/pages/Dashboard.tsx`:

```typescript
// ADD IMPORT
import { DashboardPlanSection } from "@/components/DashboardPlanSection";

// ADD TO JSX (near top of dashboard)
<DashboardPlanSection />
```

Done! Dashboard now shows plan + usage.

---

### Step 3: Update 2-3 More Pages (10 min)

Repeat Step 1 for these pages:
- [ ] `Bookings.tsx` - Use `feature: "bookings"`
- [ ] `WhatsApp.tsx` - Use `feature: "whatsapp"`  
- [ ] `Marketing.tsx` - Use `feature: "emails"` or lock AI features

All follow the same pattern!

---

### Step 4: Setup Database (5 min)

In Supabase SQL console, run:

```sql
-- User profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  subscription_plan TEXT DEFAULT 'free',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Usage tracking
CREATE TABLE IF NOT EXISTS user_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  plan TEXT DEFAULT 'free',
  usage_data JSONB DEFAULT '{
    "bookings":0,"customers":0,"whatsapp":0,"emails":0,"invoices":0,"team":0
  }'
);

-- Payment records
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  razorpay_order_id TEXT UNIQUE,
  razorpay_payment_id TEXT,
  status TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### Step 5: Test Locally (5 min)

```bash
npm run dev
```

1. Click "Guest Mode" button
2. Try 2 actions (see modals)
3. Sign up
4. Try free plan limits (10 bookings)
5. See upgrade modal

---

## 🎯 Before You Deploy

**Razorpay Setup** (if accepting payments):

1. Get API key from [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Add to `.env.local`:
```
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxx
```

3. Deploy edge functions (optional if not accepting payment yet)

**That's it!** You now have a complete paywall system.

---

## 📱 Testing Checklist

- [ ] Guest mode: 2 actions work, then shows signup modal
- [ ] Free plan: Can create 10 bookings, then shows upgrade modal
- [ ] Usage bar displays correctly
- [ ] Modals show with emotional copy
- [ ] Toast notifications appear
- [ ] Upgrade button navigates (or opens payment if integrated)

---

## 🔍 What Happens Automatically

✅ Limits are checked before any action  
✅ Usage is tracked in database  
✅ Modals show when limits reached  
✅ Guest actions trigger signup  
✅ Usage bars update in real-time  
✅ Nudges show at 70% usage  

---

## 🆘 Troubleshooting

### "Hook not found" Error
- Make sure you imported from correct path: `@/hooks/usePlanAccess`
- Check file exists: `src/hooks/usePlanAccess.ts`

### Modals don't show
- Check hooks are imported
- Check `showUpgradeModal` and `setShowUpgradeModal` are used
- Make sure modals are rendered in JSX

### Usage not updating
- Check `recordUsage()` is called after `onAllowed` callback
- Check Supabase tables exist
- Check auth context has `user` loaded

### Cannot find component
- Make sure component files exist in `src/components/`
- Check import path (use `@/components/...`)

---

## 📊 Usage Limits Reference

Just need the quick limits? Here they are:

| Plan | Bookings | Customers | WhatsApp | Emails |
|------|----------|-----------|----------|--------|
| Guest | 2 | 2 | 0 | 0 |
| Free | 10 | 3 | 50 | 0 |
| Starter | 100 | 200 | 500 | 200 |
| Growth | ∞ | ∞ | 2000 | 1000 |
| Pro | ∞ | ∞ | 10000 | 5000 |

---

## 🎨 Copy-Paste Features

```typescript
// LOCK A FEATURE
<FeatureLock isLocked={userPlan === "free"} requiredPlan="growth">
  <AIMarketingTools />
</FeatureLock>

// SHOW UPGRADE NUDGE
{usage.isLimited && (
  <UpgradeNudge
    feature="customers"
    currentPlan={userPlan}
    used={usage.used}
    limit={usage.limit}
  />
)}

// SHOW PLAN BADGE
<PlanBadge plan={userPlan} />

// CHECK IF CAN DO ACTION
if (!isActionAllowed("bookings")) {
  return <UpgradePrompt />;
}
```

---

## ✨ You're Done!

Your ASK Business Manager now has a complete monetization system! 🎉

**Next: Deploy to production and start converting free users to paid!**

For detailed info, see:
- `PAYWALL_IMPLEMENTATION_GUIDE.md` - Full setup
- `FILE_INVENTORY.md` - What's included
- `BookingsWithPaywall.example.tsx` - Complete example
