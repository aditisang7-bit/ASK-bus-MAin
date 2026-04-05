# 🚀 ASK Business Manager - Complete Paywall & Monetization System

## ✅ What's Been Created

### 📁 Core Files Created

#### **1. Plan Definitions & Types** (`lib/plans.ts`)
- Define all user plans: guest, free, starter, growth, pro
- Plan pricing in INR (₹)
- Feature limits for each plan
- Utility functions for checking access

**Plans:**
- 🟢 **Guest**: Limited demo (2 actions)
- 🔵 **Free**: 10 bookings, 3 customers, 50 WhatsApp
- 🟣 **Starter**: ₹199/month - 100 bookings, 200 customers, 500 WhatsApp
- 🟠 **Growth**: ₹499/month - Unlimited bookings, 2000 WhatsApp, AI marketing
- 🔴 **Pro**: ₹999/month - Everything unlimited, 10000 WhatsApp, custom branding

#### **2. Usage Tracking & Access Control** (`hooks/usePlanAccess.ts`)
- Track feature usage (bookings, customers, emails, etc.)
- Check if user has access to features
- Record usage when actions complete
- Automatically persist to database

#### **3. Action Guard Hook** (`hooks/useActionGuard.ts`)
- Guard any action (create, edit, delete)
- Automatically show signup or upgrade modal
- Record usage on success
- Toast notifications for user feedback

#### **4. Enhanced Auth Context** (`hooks/useAuth.tsx`)
- Added `userPlan` to auth context
- Added `upgradePlan()` method
- Automatically loads plan from database

### 🎨 UI Components Created

#### **Modals**
1. **UpgradeModal** (`components/modals/UpgradeModal.tsx`)
   - Emotional, sales-driven copy
   - Shows current usage vs limit
   - Display plan options with features
   - "Upgrade Now" CTA

2. **SignupModal** (`components/modals/SignupModal.tsx`)
   - Convert guest users to signed users
   - Highlight what they've already done
   - Security reassurance
   - Link to auth page

#### **Dashboard Components**
3. **PlanBadge** (`components/PlanBadge.tsx`)
   - Display current plan with icon
   - Color-coded by plan level
   - Sizes: sm, md, lg

4. **UsageBar** (`components/UsageBar.tsx`)
   - Show usage progress for any feature
   - Color changes: green → yellow → red based on percentage
   - Displays used/limit and percentage

5. **FeatureLock** (`components/FeatureLock.tsx`)
   - Gray out premium features
   - Show on hover: "Available in [Plan]"
   - Click to unlock (show upgrade modal)

6. **UpgradeNudge** (`components/UpgradeNudge.tsx`)
   - Show at 70% usage
   - Emotional messaging
   - "Upgrade Plan" button
   - Dismissible

7. **DashboardPlanSection** (`components/DashboardPlanSection.tsx`)
   - Complete plan overview
   - Show all usage bars
   - Current plan details
   - Upgrade button
   - Guest mode banner

### 💳 Payment Integration

**Razorpay Utils** (`lib/razorpay.ts`)
- Load Razorpay script
- Create orders via backend
- Verify payments
- Open checkout modal
- Format pricing for display

### 📝 Documentation Files

1. **PAYWALL_INTEGRATION.ts** - Integration patterns and examples
2. **BookingsWithPaywall.example.tsx** - Complete example of integrating into a page

---

## 🔧 What You Need to Do

### Step 1: Create Database Tables

Run these migrations in Supabase:

```sql
-- User profiles with subscription
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  subscription_plan TEXT DEFAULT 'free' CHECK (subscription_plan IN ('guest', 'free', 'starter', 'growth', 'pro')),
  subscription_status TEXT DEFAULT 'active',
  subscription_started_at TIMESTAMP DEFAULT NOW(),
  subscription_ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Usage tracking
CREATE TABLE user_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  plan TEXT DEFAULT 'free',
  usage_data JSONB DEFAULT '{
    "bookings": 0,
    "customers": 0,
    "whatsapp": 0,
    "emails": 0,
    "invoices": 0,
    "team": 0
  }'::jsonb,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Payment records
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  plan_id TEXT,
  amount NUMERIC,
  razorpay_order_id TEXT UNIQUE,
  razorpay_payment_id TEXT UNIQUE,
  razorpay_signature TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('success', 'failed', 'pending')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Step 2: Set Environment Variables

Add to `.env.local`:

```
VITE_RAZORPAY_KEY_ID=your_razorpay_key_here
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

### Step 3: Create Razorpay Edge Functions

Create in `supabase/functions/razorpay-order/index.ts`:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Razorpay from 'https://esm.sh/razorpay@2.8.2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
)

const razorpay = new Razorpay({
  key_id: Deno.env.get('RAZORPAY_KEY_ID') || '',
  key_secret: Deno.env.get('RAZORPAY_KEY_SECRET') || '',
})

Deno.serve(async (req) => {
  const { planId, userId, amount } = await req.json()

  try {
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `order_${userId}_${Date.now()}`,
    })

    await supabase.from('payments').insert({
      user_id: userId,
      plan_id: planId,
      amount: amount / 100,
      razorpay_order_id: order.id,
      status: 'pending',
    })

    return new Response(JSON.stringify({ orderId: order.id }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
```

Create in `supabase/functions/razorpay-verify/index.ts`:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import crypto from 'https://deno.land/std@0.170.0/node/crypto.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
)

Deno.serve(async (req) => {
  const {
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
    planId,
    userId,
  } = await req.json()

  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET') || ''
  const body = `${razorpay_order_id}|${razorpay_payment_id}`
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(body)
    .digest('hex')

  if (expectedSignature === razorpay_signature) {
    // Payment verified - update user plan
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        subscription_plan: planId,
        subscription_status: 'active',
        subscription_started_at: new Date().toISOString(),
      })

    const { error: paymentError } = await supabase
      .from('payments')
      .update({
        razorpay_signature,
        status: 'success',
      })
      .eq('razorpay_order_id', razorpay_order_id)

    if (!profileError && !paymentError) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  return new Response(JSON.stringify({ success: false }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  })
})
```

### Step 4: Update Your Pages

For each page (Bookings, CRM, WhatsApp, etc.), import and use:

```typescript
// 1. Add imports
import { useActionGuard } from "@/hooks/useActionGuard";
import { useAuth } from "@/hooks/useAuth";
import { SignupModal } from "@/components/modals/SignupModal";
import { UpgradeModal } from "@/components/modals/UpgradeModal";
import { UpgradeNudge } from "@/components/UpgradeNudge";

// 2. Get hooks
const { userPlan } = useAuth();
const { checkAndGuardAction, showUpgradeModal, setShowUpgradeModal } = useActionGuard();

// 3. Guard your action
const handleCreateItem = async () => {
  await checkAndGuardAction({
    feature: "bookings", // or "customers", "whatsapp", etc.
    actionName: "Booking",
    onAllowed: async () => {
      // Your actual creation logic
      await createBooking();
    },
  });
};

// 4. Add modals
<UpgradeModal
  isOpen={showUpgradeModal}
  onClose={() => setShowUpgradeModal(false)}
  currentPlan={userPlan}
/>
```

### Step 5: Add to Dashboard

```typescript
import { DashboardPlanSection } from "@/components/DashboardPlanSection";

export function Dashboard() {
  return (
    <>
      <DashboardPlanSection />
      {/* Rest of dashboard */}
    </>
  );
}
```

---

## 🎯 Integration Checklist

- [ ] Create database tables (migrations)
- [ ] Set environment variables
- [ ] Create Razorpay edge functions
- [ ] Update Dashboard with DashboardPlanSection
- [ ] Update Bookings.tsx with paywall guards
- [ ] Update CRM.tsx with customer limit guards
- [ ] Update WhatsApp.tsx with message limit guards
- [ ] Update Marketing.tsx with AI feature locks
- [ ] Update Team.tsx with team member limits
- [ ] Update Billing.tsx to show plans
- [ ] Test guest mode (2 action limit)
- [ ] Test free plan limits (10 bookings, etc.)
- [ ] Test upgrade flow (Razorpay)
- [ ] Test usage tracking & persistence

---

## 💡 Key Features Implemented

✅ **Guest Mode** - 2 demo actions before signup
✅ **5 Pricing Tiers** - Free to Pro with clear limits
✅ **Usage Tracking** - Real-time tracking per user, persisted to DB
✅ **Smart Guards** - Automatic paywall on feature limits
✅ **Emotional UI** - Sales-driven copy that feels helpful, not pushy
✅ **Usage Bars** - Visual progress indicators across dashboard
✅ **Upgrade Nudges** - Prompt at 70% usage
✅ **Feature Locks** - Grade out premium features
✅ **Razorpay Integration** - Full payment flow ready
✅ **Toast Notifications** - User-friendly feedback

---

## 🚀 Next Steps

1. **Test Everything Locally**
   - Run `npm run dev`
   - Open guest mode and try 2 actions
   - Sign up as free user
   - Try to exceed limit
   - See upgrade modal

2. **Deploy to Supabase**
   - Deploy edge functions
   - Run migrations
   - Update environment variables

3. **Monitor & Iterate**
   - Track conversion rates
   - Monitor Razorpay transactions
   - Adjust messaging based on user behavior

---

## 📊 Usage Limits by Plan

| Feature | Guest | Free | Starter | Growth | Pro |
|---------|-------|------|---------|--------|-----|
| Bookings | 2 | 10 | 100 | ∞ | ∞ |
| Customers | 2 | 3 | 200 | ∞ | ∞ |
| WhatsApp | 0 | 50 | 500 | 2000 | 10000 |
| Emails | 0 | 0 | 200 | 1000 | 5000 |
| Team | 0 | 1 | 1 | 3 | 10 |
| AI Tools | ❌ | ❌ | ❌ | ✅ | ✅ |
| Priority Support | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## 📞 Support

Need help integrating? Review:
- `PAYWALL_INTEGRATION.ts` - All integration patterns
- `BookingsWithPaywall.example.tsx` - Complete working example
- Component documentation in each file

Good luck with the monetization! 🎉
