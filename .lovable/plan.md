

# Plan: Production-Ready Upgrade for ASK Business Manager

## Critical Finding

**Razorpay LIVE keys are NOT configured.** The secrets store only has `LOVABLE_API_KEY`. Before any real payment can work, you must add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` as secrets. I will prompt you for these.

---

## Scope & Prioritization

This request covers 7+ major areas. I will implement them in priority order across two phases. Phase 1 covers the critical payment/billing/enforcement fixes. Phase 2 covers new features (mini website builder, marketing automation, lead tracking, etc.) and will be a follow-up.

---

## Phase 1 (This Implementation)

### 1. Add Razorpay LIVE Keys as Secrets
- Use `add_secret` for `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`
- All edge functions already read these correctly

### 2. Update Plan Limits (Pricing Refinement)
Update `usePlan.ts` PLAN_LIMITS:
- **Starter**: customers 5 → 200, bookings 50 → 100
- **Growth**: add team: 3
- **Pro**: add white-label flag, custom domain flag

Update `PricingSection.tsx` feature lists to match.

### 3. Enforce Limits in Feature Pages
Add `enforceLimit()` checks before create actions in:
- `Bookings.tsx` — check `bookings` before adding
- `CRM.tsx` — check `customers` before adding
- `Team.tsx` — check `team` before adding
- `WhatsApp.tsx` — check `whatsapp_messages` before sending
- `AIStudio.tsx` — check `ai_calls` before using

Each blocked action opens `UpgradeModal` (already wired). Call `incrementUsage()` after successful creation.

### 4. Usage Progress Bars in Dashboard
Enhance `Dashboard.tsx` to show usage bars:
- Bookings: X/Y used (with progress bar + color coding)
- Customers: X/Y
- WhatsApp: X/Y
- Warning color at 80%, red at 100%

### 5. Upgrade Button in Dashboard
Add prominent "Upgrade Plan" CTA in Dashboard header area that opens `UpgradeModal`.

### 6. Invoice Razorpay Payment Enhancement
In `Billing.tsx` / `InvoiceView.tsx`:
- "Pay via Razorpay" button on each unpaid invoice already exists
- Ensure it calls `razorpay-order` and opens checkout
- On success, call `razorpay-verify` to mark invoice as paid
- Show status badges: Paid (green), Pending (yellow), Overdue (red) based on `due_date`

### 7. Admin Dashboard Improvements
Enhance `AdminDashboard.tsx`:
- Add "Users" tab showing all users with plan/status (via `admin-stats` edge function — add user list endpoint)
- Add revenue chart (monthly totals from payments table)
- Already has: messages, coupons, payment logs

### 8. Billing History in Billing Page
The Billing page's "History" tab should query `payments` table and display recent transactions with amount, status, date, and Razorpay payment ID.

---

## Database Changes
- **None required** — all tables exist. Only code-level changes.

## Edge Function Changes
- Update `admin-stats` to return user list with plans (for admin Users tab)

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/usePlan.ts` | Update limits for Starter/Growth/Pro |
| `src/components/landing/PricingSection.tsx` | Update feature lists |
| `src/pages/Dashboard.tsx` | Add usage progress bars + upgrade CTA |
| `src/pages/Bookings.tsx` | Add enforceLimit + incrementUsage |
| `src/pages/CRM.tsx` | Add enforceLimit + incrementUsage |
| `src/pages/Team.tsx` | Add enforceLimit + incrementUsage |
| `src/pages/WhatsApp.tsx` | Add enforceLimit + incrementUsage |
| `src/pages/AIStudio.tsx` | Add enforceLimit + incrementUsage |
| `src/pages/Billing.tsx` | Add overdue status logic, enhance history tab |
| `src/pages/AdminDashboard.tsx` | Add Users tab with plan info |
| `supabase/functions/admin-stats/index.ts` | Add user list with subscriptions |

---

## Phase 2 (Follow-up, not this implementation)
- Mini Website Builder
- Marketing Automation (scheduled campaigns)
- SEO optimization for business pages
- Complaint/Support system
- Lead tracking system
- Onboarding flow (buyer/seller selection)
- White-label & custom domain features for Pro plan

---

## First Step
I will request the Razorpay LIVE keys from you, then implement all Phase 1 changes.

