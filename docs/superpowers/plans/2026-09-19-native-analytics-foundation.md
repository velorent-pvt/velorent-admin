# Native Analytics Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist secure, customer-level analytics events in Supabase and instrument the VeloRent Android app across search, vehicle, booking, KYC, and Cashfree payment journeys.

**Architecture:** A Supabase migration creates an append-only `analytics_events` store, a validated authenticated RPC, and exception-safe triggers for authoritative KYC and booking outcomes. The native app uses a typed provider-neutral analytics client with a bounded per-customer AsyncStorage queue; screens emit behavioral and unsuccessful-attempt events while the database emits authoritative state outcomes.

**Tech Stack:** PostgreSQL/Supabase migrations, Expo 54/React Native, TypeScript, Supabase JS, AsyncStorage, and Expo Crypto.

**Spec:** `docs/superpowers/specs/2026-09-19-native-analytics-foundation-design.md`

## Global Constraints

- Phase 1 includes event storage, ingestion, and native wiring only; no admin report UI.
- Every stored event must have an authenticated `customer_id` derived from `auth.uid()`; pre-login events are not tracked.
- `platform` is required and defaults to `android`.
- Do not store emails, phone numbers, addresses, government IDs, KYC files/content, payment credentials, or raw provider/error payloads.
- Analytics failures must never block search, KYC, payment, booking, or cancellation workflows.
- Preserve all unrelated existing changes in both repositories.
- Per user direction, do not add or run automated tests; verify with static checks, builds, database inspection, and a manual Android journey.

## Review Focus

- A queued event created by customer A must never be sent while customer B is authenticated; queues are keyed by customer ID and only flushed for the current authenticated user.
- Duplicate client retries or trigger executions must create one row through a unique `idempotency_key`.
- Oversized or privacy-sensitive metadata must be rejected without breaking product workflows.
- Cashfree `action_cancelled` must never be classified as failure or abandonment.
- A successful payment followed by booking creation failure must preserve both facts: `payment_successful` and `booking_failed`.

---

### Task 1: Supabase Analytics Store And Authenticated Ingestion

**Files:**
- Create: `supabase/migrations/20260919090000_analytics_events.sql`

**Interfaces:**
- Consumes: Existing `public.customers`, `public.cars`, and `public.bookings` identifiers; authenticated Supabase JWTs.
- Produces: `public.analytics_event_name`, `public.analytics_events`, `public.track_analytics_event(...) returns uuid`, and authoritative KYC/booking triggers.

- [ ] **Step 1: Implement the analytics enum, table, indexes, and RLS**

Create the approved event enum and table from the spec. Use server defaults for `id`, `received_at`, `occurred_at`, `properties`, and `platform = 'android'`. Make `customer_id`, `event_name`, `idempotency_key`, and `platform` non-null.

Create indexes for event/date, customer/date, vehicle/date, search, booking, booking attempt, payment attempt, Cashfree order, and normalized location. Enable RLS, revoke direct mutations from `anon` and `authenticated`, and expose no client read policy.

- [ ] **Step 2: Implement authenticated RPC ingestion**

Use this public interface:

```sql
create or replace function public.track_analytics_event(
  p_event_name public.analytics_event_name,
  p_idempotency_key text,
  p_occurred_at timestamptz default now(),
  p_search_id uuid default null,
  p_booking_attempt_id uuid default null,
  p_payment_attempt_id uuid default null,
  p_vehicle_id uuid default null,
  p_booking_id uuid default null,
  p_cashfree_order_id text default null,
  p_search_location text default null,
  p_pickup_at timestamptz default null,
  p_dropoff_at timestamptz default null,
  p_result_count integer default null,
  p_amount numeric default null,
  p_currency text default null,
  p_failure_reason text default null,
  p_cancellation_reason text default null,
  p_app_version text default null,
  p_properties jsonb default '{}'::jsonb
) returns uuid
```

Derive `customer_id` exclusively from `auth.uid()` and reject missing authentication. Validate required event-specific IDs, bounded timestamps and strings, non-negative counts/amounts, JSON size/depth, and prohibited personal-data keys. Insert with `ON CONFLICT (idempotency_key) DO NOTHING`, returning the existing row only when it belongs to the same customer. Grant RPC execution only to `authenticated`.

- [ ] **Step 3: Add exception-safe authoritative triggers**

Use deterministic idempotency keys:

```sql
format('booking:%s:confirmed', new.id)
format('booking:%s:cancelled', new.id)
format('customer:%s:kyc_completed', new.id)
```

Booking triggers fire only when entering `confirmed` or `cancelled`. KYC completion fires only when Aadhaar number/name/address and driving-license number are populated and the prior row was not fully verified. Wrap analytics inserts in exception blocks that raise warnings and return `new`, ensuring analytics never rolls back product transactions.

- [ ] **Step 4: Validate the migration locally**

Run:

```powershell
supabase db lint
supabase db reset
```

Inspect table constraints, RLS grants, function grants, and trigger definitions with Supabase Studio or `psql`. Manually invoke the RPC authenticated and unauthenticated, repeat one idempotency key, and confirm rejection/deduplication behavior.

- [ ] **Step 5: Commit the database contract**

```powershell
git add supabase/migrations/20260919090000_analytics_events.sql
git commit -m "feat: add customer analytics event store"
```

---

### Task 2: Typed Native Event Contract And Analytics Client

**Files:**
- Create: `D:\omkar\velorent-native\lib\analytics\events.ts`
- Create: `D:\omkar\velorent-native\lib\analytics\client.ts`
- Create: `D:\omkar\velorent-native\lib\analytics\index.ts`
- Modify: `D:\omkar\velorent-native\app\_layout.tsx`

**Interfaces:**
- Consumes: Task 1 RPC and the existing Supabase/auth/AsyncStorage clients.
- Produces: `analytics.track(name, payload)`, `analytics.flush(customerId)`, `analytics.createId()`, and typed payloads for every approved event.

- [ ] **Step 1: Define the event payload contract**

Create a discriminated `AnalyticsEventPayloadMap` covering all approved events. Require `vehicleId`, `searchId`, `bookingAttemptId`, and `paymentAttemptId` only where applicable. Define controlled `failureReason` and `cancellationReason` codes; do not expose arbitrary error-message fields.

Add pure `classifyCashfreeOutcome(errorCode)` and `normalizeFailureReason(error)` functions. `action_cancelled` maps only to `payment_cancelled`; unknown/raw error text maps to `unknown_error`.

- [ ] **Step 2: Implement the per-customer queue**

Queue keys must be customer-specific:

```ts
const queueKey = (customerId: string) => `@velorent/analytics:${customerId}`;
```

Obtain the current authenticated user before queueing. If no user exists, return without creating an event. Store the customer ID inside the local queue record for ownership checks, but never send it as an RPC parameter. Write to AsyncStorage before delivery, cap each queue at 200 newest events, and expire records after seven days.

Keep transient network/server failures queued with bounded exponential backoff. Remove accepted/duplicate events. Drop permanent validation failures after development-only controlled logging.

- [ ] **Step 3: Implement the Supabase transport**

Map camelCase native payloads to Task 1 RPC parameter names. Enrich events with app version, Android platform, occurrence time, and a UUID idempotency key. Development logs may include only event name, idempotency key, and controlled delivery status.

- [ ] **Step 4: Initialize authenticated app-open tracking**

In `app/_layout.tsx`, after session and profile readiness:

```ts
void analytics.track("app_opened", {});
void analytics.flush(session.user.id);
```

Guard this so it runs once per process launch, then flush the same customer's queue when the app returns to foreground.

- [ ] **Step 5: Run static verification and commit**

```powershell
npx.cmd eslint lib/analytics app/_layout.tsx
npx.cmd tsc --noEmit
git add lib/analytics app/_layout.tsx
git commit -m "feat: add queued customer analytics client"
```

Record unrelated pre-existing TypeScript failures separately; no new error may reference analytics files.

---

### Task 3: Search And Vehicle Discovery Instrumentation

**Files:**
- Modify: `D:\omkar\velorent-native\app\all-cars.tsx`
- Modify: `D:\omkar\velorent-native\app\car-result.tsx`
- Modify: `D:\omkar\velorent-native\app\car-detail.tsx`

**Interfaces:**
- Consumes: `analytics.track()` and `analytics.createId()` from Task 2.
- Produces: Correlated search submission/result events and deduplicated vehicle detail views.

- [ ] **Step 1: Track submitted searches**

Generate one `searchId` when the user submits location/date/filter criteria. Emit `vehicle_searched` with normalized location, pickup/drop-off timestamps, and controlled filter properties. Carry `searchId` through local state or route params.

- [ ] **Step 2: Track successful search results**

After a successful query, emit `search_results_viewed` once for the search/result signature with `resultCount`. Emit `search_no_results` as an additional event only when the successful result count is zero. Do not emit result events for loading, stale, or error states.

- [ ] **Step 3: Track vehicle details**

In `car-detail.tsx`, emit `vehicle_details_viewed` after the requested vehicle successfully loads, once per mounted vehicle ID. Include incoming `searchId` when available.

- [ ] **Step 4: Run focused verification and commit**

```powershell
npx.cmd eslint app/all-cars.tsx app/car-result.tsx app/car-detail.tsx
npx.cmd tsc --noEmit
git add app/all-cars.tsx app/car-result.tsx app/car-detail.tsx
git commit -m "feat: track customer search and vehicle discovery"
```

---

### Task 4: Booking Attempt And KYC Instrumentation

**Files:**
- Modify: `D:\omkar\velorent-native\store\use-booking-store.ts`
- Modify: `D:\omkar\velorent-native\app\car-detail.tsx`
- Modify: `D:\omkar\velorent-native\app\verify-aadhaar.tsx`
- Modify: `D:\omkar\velorent-native\app\verify-driving-license.tsx`

**Interfaces:**
- Consumes: Analytics client and existing booking/KYC flows.
- Produces: Persistent `bookingAttemptId`, `booking_started`, `kyc_started`, and `kyc_failed`. The database owns `kyc_completed`.

- [ ] **Step 1: Add booking-attempt correlation state**

Add `bookingAttemptId?: string`, `startBookingAttempt(vehicleId)`, and reset behavior to the existing booking store. Preserve the ID throughout booking navigation and clear it only after confirmed booking or explicit flow reset.

- [ ] **Step 2: Track booking start**

When an authenticated eligible customer taps Book Now, create/persist the attempt ID and emit `booking_started` with vehicle and optional search IDs. Do not emit when eligibility checks prevent entering the flow.

- [ ] **Step 3: Track KYC starts and failures**

Emit `kyc_started` when DigiLocker launches or the first manual document upload begins, with controlled `documentType` and `method` properties. Emit `kyc_failed` only on a terminal provider/submission failure using normalized reason codes. Never include document content or identity values.

Do not emit client-side `kyc_completed`; the database trigger owns aggregate completion after both required documents are verified.

- [ ] **Step 4: Run focused verification and commit**

```powershell
npx.cmd eslint store/use-booking-store.ts app/car-detail.tsx app/verify-aadhaar.tsx app/verify-driving-license.tsx
npx.cmd tsc --noEmit
git add store/use-booking-store.ts app/car-detail.tsx app/verify-aadhaar.tsx app/verify-driving-license.tsx
git commit -m "feat: track booking starts and KYC outcomes"
```

---

### Task 5: Cashfree Payment And Booking Outcome Instrumentation

**Files:**
- Modify: `D:\omkar\velorent-native\app\car-book\checkout.tsx`

**Interfaces:**
- Consumes: Cashfree classifier, analytics client, and booking attempt state.
- Produces: Correlated payment lifecycle events and client-side `booking_failed`; the database owns `booking_confirmed`.

- [ ] **Step 1: Create one payment-attempt correlation per Cashfree checkout**

Generate `paymentAttemptId` when Cashfree order creation succeeds. Emit `payment_started` after order creation and immediately before native checkout, including amount, currency, vehicle, booking attempt, and Cashfree order ID.

- [ ] **Step 2: Track mutually exclusive Cashfree outcomes**

Map boundaries exactly:

```text
verifyCashfreeOrder(...).isPaid === true -> payment_successful
onError code === action_cancelled       -> payment_cancelled
onError any other code                  -> payment_failed
verification retries exhausted          -> payment_pending
```

Preserve current alerts and backend verification. Analytics calls are fire-and-forget.

- [ ] **Step 3: Track booking failure after payment**

If `createBooking` fails after verified payment, emit `booking_failed` with `creation_failed_after_payment` and the same booking/payment attempt IDs. Do not emit client-side `booking_confirmed`; the database trigger owns it. Reset booking-attempt state only after confirmed booking or explicit flow reset.

- [ ] **Step 4: Run focused verification and commit**

```powershell
npx.cmd eslint app/car-book/checkout.tsx lib/analytics
npx.cmd tsc --noEmit
git add app/car-book/checkout.tsx lib/analytics
git commit -m "feat: track Cashfree and booking outcomes"
```

---

### Task 6: End-To-End Verification And Handoff

**Files:**
- Create: `D:\omkar\velorent-native\docs\analytics-event-verification.md`

**Interfaces:**
- Consumes: Complete database and native analytics implementation.
- Produces: Repeatable manual verification instructions and a verified Phase 1 handoff.

- [ ] **Step 1: Document the manual journey and expected event order**

```text
Authenticated launch -> app_opened
Search with results -> vehicle_searched, search_results_viewed
Search without results -> vehicle_searched, search_results_viewed, search_no_results
Open vehicle -> vehicle_details_viewed
Tap Book Now -> booking_started
Start/finish both KYC docs -> kyc_started..., one kyc_completed trigger
Start and cancel Cashfree -> payment_started, payment_cancelled
Retry and pay -> payment_started, payment_successful, booking_confirmed trigger
Cancel booking -> booking_cancelled trigger
```

Include a SQL query selecting only non-sensitive columns by customer and occurrence time.

- [ ] **Step 2: Run static and build verification**

Admin repository:

```powershell
supabase db lint
npm.cmd run typecheck
npm.cmd run build
```

Native repository:

```powershell
npx.cmd eslint lib/analytics app/_layout.tsx app/all-cars.tsx app/car-result.tsx app/car-detail.tsx app/verify-aadhaar.tsx app/verify-driving-license.tsx app/car-book/checkout.tsx store/use-booking-store.ts
npx.cmd tsc --noEmit
npx.cmd expo export --platform android --output-dir .tmp-analytics-export --clear
```

Remove only the verified `.tmp-analytics-export` directory afterward. Report unrelated pre-existing failures without modifying unrelated files.

- [ ] **Step 3: Perform privacy and payload audit**

Search analytics calls for personal fields, raw provider responses, and raw errors. Confirm every payload uses controlled IDs, amounts, dates, counts, and reason codes only.

- [ ] **Step 4: Execute the authenticated Android journey**

Use one test customer. Confirm event order, customer attribution, correlation IDs, idempotency, authoritative triggers, cancellation classification, and that disabling RPC access does not break product workflows.

- [ ] **Step 5: Commit verification documentation**

```powershell
git add docs/analytics-event-verification.md
git commit -m "docs: add analytics event verification guide"
```
