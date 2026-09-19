# Native Analytics Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist secure, customer-level analytics events in Supabase and instrument the VeloRent Android app across search, vehicle, booking, KYC, and Cashfree payment journeys.

**Architecture:** A Supabase migration creates an append-only `analytics_events` store, a validated authenticated RPC, and exception-safe triggers for authoritative KYC and booking outcomes. The native app uses a typed provider-neutral analytics client with a bounded per-customer AsyncStorage queue; screens emit behavioral and unsuccessful-attempt events while the database emits authoritative state outcomes.

**Tech Stack:** PostgreSQL/Supabase migrations and pgTAP, Expo 54/React Native, TypeScript, Supabase JS, AsyncStorage, Expo Crypto, Node test runner with `tsx`.

**Spec:** `docs/superpowers/specs/2026-09-19-native-analytics-foundation-design.md`

## Global Constraints

- Phase 1 includes event storage, ingestion, and native wiring only; no admin report UI.
- Every stored event must have an authenticated `customer_id` derived from `auth.uid()`; pre-login events are not tracked.
- `platform` is required and defaults to `android`.
- Do not store emails, phone numbers, addresses, government IDs, KYC files/content, payment credentials, or raw provider/error payloads.
- Analytics failures must never block search, KYC, payment, booking, or cancellation workflows.
- Preserve all unrelated existing changes in both repositories.
- Use test-first development for every production behavior.

## Review Focus

- A queued event created by customer A must never be sent while customer B is authenticated; Task 3 tests per-customer queue ownership.
- Duplicate client retries or trigger executions must create one row; Task 1 tests `idempotency_key` conflict handling.
- Oversized or privacy-sensitive metadata must be rejected without breaking product workflows; Tasks 1 and 3 test validation and permanent-failure disposal.
- Cashfree `action_cancelled` must never be classified as failure or abandonment; Task 6 tests all mutually exclusive terminal outcomes.
- A successful payment followed by booking creation failure must emit `payment_successful` and `booking_failed` with the same attempt correlations; Task 6 tests this split outcome.

---

### Task 1: Supabase Analytics Store And Authenticated Ingestion

**Files:**
- Create: `supabase/migrations/20260919090000_analytics_events.sql`
- Create: `supabase/tests/analytics_events_test.sql`

**Interfaces:**
- Consumes: Existing `public.customers`, `public.cars`, and `public.bookings` identifiers; authenticated Supabase JWTs.
- Produces: `public.analytics_event_name`, `public.analytics_events`, `public.track_analytics_event(...) returns uuid`, and authoritative KYC/booking triggers.

- [ ] **Step 1: Write failing pgTAP tests for schema, RPC security, validation, and idempotency**

Create tests that assert:

```sql
select has_table('public', 'analytics_events');
select has_function('public', 'track_analytics_event');
select col_is_not_null('public', 'analytics_events', 'customer_id');
select col_has_default('public', 'analytics_events', 'platform');

-- Set request.jwt.claim.sub to a seeded customer UUID, call the RPC twice
-- with idempotency_key = 'test:search:1', then assert exactly one row exists.
select is(
  (select count(*)::integer from public.analytics_events
   where idempotency_key = 'test:search:1'),
  1,
  'duplicate analytics events are idempotent'
);

-- Clear auth claims and assert track_analytics_event raises authentication_required.
-- Assert unknown events, negative result_count, overlong reasons, and properties
-- containing email/phone/aadhaar keys are rejected.
```

Include trigger tests that transition a booking to `confirmed`, then `cancelled`, and complete both customer KYC requirements; assert one authoritative event per outcome even when the update repeats.

- [ ] **Step 2: Run the database tests and verify RED**

Run from `D:\omkar\velorent-admin`:

```powershell
supabase test db supabase/tests/analytics_events_test.sql
```

Expected: FAIL because `analytics_events` and `track_analytics_event` do not exist.

- [ ] **Step 3: Implement the migration**

Create the enum with the approved values and the table with the exact contract from the spec. The RPC signature is:

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

Implementation requirements:

```sql
-- Derive, never accept, customer identity.
v_customer_id := auth.uid();
if v_customer_id is null then
  raise exception 'authentication_required' using errcode = '42501';
end if;

-- Idempotent insert. Return the existing ID on conflict.
insert into public.analytics_events (...)
values (..., v_customer_id, ..., 'android', ...)
on conflict (idempotency_key) do nothing
returning id into v_event_id;

if v_event_id is null then
  select id into v_event_id
  from public.analytics_events
  where idempotency_key = p_idempotency_key
    and customer_id = v_customer_id;
end if;
```

Validate event-specific required IDs, lengths, non-negative values, occurrence-time skew, metadata size, and prohibited metadata keys recursively. Enable RLS without client table policies; revoke direct mutations and grant only RPC execution to `authenticated`.

Add exception-safe security-definer trigger functions:

```sql
-- Idempotency keys:
format('booking:%s:confirmed', new.id)
format('booking:%s:cancelled', new.id)
format('customer:%s:kyc_completed', new.id)
```

Booking triggers fire only on entry into the target status. KYC completion fires only when Aadhaar number/name/address and driving-license number become populated and the prior row was not fully verified. Wrap analytics insertion in an exception block that raises a warning and returns `new` so analytics cannot roll back the product transaction.

- [ ] **Step 4: Run pgTAP and verify GREEN**

Run:

```powershell
supabase test db supabase/tests/analytics_events_test.sql
```

Expected: all analytics schema, RPC, RLS, idempotency, privacy, and trigger tests pass.

- [ ] **Step 5: Commit the database contract**

```powershell
git add supabase/migrations/20260919090000_analytics_events.sql supabase/tests/analytics_events_test.sql
git commit -m "feat: add customer analytics event store"
```

---

### Task 2: Typed Event Contract And Outcome Classification

**Files:**
- Modify: `D:\omkar\velorent-native\package.json`
- Modify: `D:\omkar\velorent-native\package-lock.json`
- Create: `D:\omkar\velorent-native\lib\analytics\events.ts`
- Create: `D:\omkar\velorent-native\lib\analytics\events.test.ts`

**Interfaces:**
- Consumes: Approved event names and RPC parameter names from Task 1.
- Produces: `AnalyticsEventName`, `AnalyticsEventPayloadMap`, `QueuedAnalyticsEvent`, `classifyCashfreeOutcome(errorCode)`, and `normalizeFailureReason(error)`.

- [ ] **Step 1: Add the TypeScript test runner and failing contract tests**

Add `tsx` as a dev dependency and scripts:

```json
{
  "scripts": {
    "test:analytics": "node --import tsx --test lib/analytics/*.test.ts"
  }
}
```

Write table-driven Node tests with literal expectations:

```ts
test("classifies Cashfree cancellation separately", () => {
  assert.equal(classifyCashfreeOutcome("action_cancelled"), "payment_cancelled");
  assert.equal(classifyCashfreeOutcome("payment_failed"), "payment_failed");
});

test("normalizes errors without retaining sensitive text", () => {
  assert.equal(normalizeFailureReason({ code: "NETWORK_ERROR" }), "network_error");
  assert.equal(normalizeFailureReason(new Error("phone +91...")), "unknown_error");
});
```

Add compile-time fixtures proving each event accepts only its allowed fields, for example `vehicle_details_viewed` requires `vehicleId`, payment events require `paymentAttemptId`, and search result events require `searchId` plus `resultCount`.

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
npm.cmd run test:analytics
```

Expected: FAIL because the event contract module does not exist.

- [ ] **Step 3: Implement the typed contract and pure classifiers**

Define a discriminated payload map:

```ts
export type AnalyticsEventPayloadMap = {
  app_opened: BasePayload;
  vehicle_searched: SearchPayload;
  search_results_viewed: SearchResultPayload;
  search_no_results: SearchResultPayload;
  vehicle_details_viewed: VehiclePayload;
  booking_started: BookingAttemptPayload;
  booking_failed: BookingFailurePayload;
  kyc_started: KycPayload;
  kyc_completed: KycPayload;
  kyc_failed: KycFailurePayload;
  payment_started: PaymentPayload;
  payment_successful: PaymentPayload;
  payment_failed: PaymentFailurePayload;
  payment_pending: PaymentPayload;
  payment_cancelled: PaymentCancellationPayload;
  booking_confirmed: BookingOutcomePayload;
  booking_cancelled: BookingCancellationPayload;
};
```

Use controlled reason codes only. Do not include arbitrary message fields in any payload type.

- [ ] **Step 4: Run tests and typecheck**

Run:

```powershell
npm.cmd run test:analytics
npx.cmd tsc --noEmit
```

Expected: analytics tests pass. Record unrelated pre-existing TypeScript failures separately; no new error may reference `lib/analytics/events.ts` or its test.

- [ ] **Step 5: Commit the event contract**

```powershell
git add package.json package-lock.json lib/analytics/events.ts lib/analytics/events.test.ts
git commit -m "feat: define native analytics event contract"
```

---

### Task 3: Per-Customer Offline Queue And Supabase Transport

**Files:**
- Create: `D:\omkar\velorent-native\lib\analytics\client.ts`
- Create: `D:\omkar\velorent-native\lib\analytics\client.test.ts`
- Create: `D:\omkar\velorent-native\lib\analytics\index.ts`
- Modify: `D:\omkar\velorent-native\app\_layout.tsx`

**Interfaces:**
- Consumes: `AnalyticsEventPayloadMap` from Task 2 and `track_analytics_event` from Task 1.
- Produces: `analytics.track(name, payload)`, `analytics.flush(customerId)`, `analytics.createId()`, and authenticated app-open tracking.

- [ ] **Step 1: Write failing queue behavior tests with injected storage and transport**

Use in-memory fakes implementing these interfaces:

```ts
export interface AnalyticsStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface AnalyticsTransport {
  send(event: QueuedAnalyticsEvent): Promise<"accepted" | "duplicate">;
}
```

Tests must prove:

```ts
test("never flushes customer A events as customer B", async () => { /* literal IDs */ });
test("keeps transient failures queued and removes accepted events", async () => {});
test("drops invalid permanent failures instead of retrying forever", async () => {});
test("caps each customer queue at 200 newest events", async () => {});
test("drops queued events older than seven days", async () => {});
test("deduplicates app_opened during one app launch", async () => {});
```

- [ ] **Step 2: Run tests and verify RED**

Run `npm.cmd run test:analytics`.

Expected: FAIL because `AnalyticsClient` does not exist.

- [ ] **Step 3: Implement the queue and transport adapter**

Implement `AnalyticsClient` with dependency injection. Queue keys must be customer-specific:

```ts
const queueKey = (customerId: string) => `@velorent/analytics:${customerId}`;
```

`track()` obtains the current authenticated user before queueing. If no user exists, it returns without creating an event. It writes to storage before attempting delivery and returns immediately to callers after queueing/scheduling flush.

Map camelCase native payloads to the exact RPC parameter names from Task 1. Classify Supabase authentication/network/5xx errors as retryable; classify validation/4xx contract errors as permanent. Treat duplicate acknowledgement as success.

The production singleton uses AsyncStorage, `expo-crypto` UUIDs, Expo Constants app version, and the existing Supabase client. Development logging includes only event name, idempotency key, and controlled status.

- [ ] **Step 4: Initialize after authentication and emit app-open**

In `app/_layout.tsx`, after the authenticated session and profile are ready:

```ts
void analytics.track("app_opened", {});
void analytics.flush(session.user.id);
```

Guard the effect so the event is emitted once per process launch, not on every profile rerender. Flush again when the app returns to foreground and the same customer remains authenticated.

- [ ] **Step 5: Run focused tests, lint, and typecheck**

Run:

```powershell
npm.cmd run test:analytics
npx.cmd eslint lib/analytics app/_layout.tsx
npx.cmd tsc --noEmit
```

Expected: analytics tests and focused lint pass; no new analytics-related TypeScript errors.

- [ ] **Step 6: Commit the client**

```powershell
git add lib/analytics app/_layout.tsx
git commit -m "feat: add queued customer analytics client"
```

---

### Task 4: Search And Vehicle Discovery Instrumentation

**Files:**
- Modify: `D:\omkar\velorent-native\app\all-cars.tsx`
- Modify: `D:\omkar\velorent-native\app\car-result.tsx`
- Modify: `D:\omkar\velorent-native\app\car-detail.tsx`
- Create: `D:\omkar\velorent-native\lib\analytics\search-events.ts`
- Create: `D:\omkar\velorent-native\lib\analytics\search-events.test.ts`

**Interfaces:**
- Consumes: `analytics.track()` and `analytics.createId()` from Task 3.
- Produces: one correlated search submission/result pair and deduplicated vehicle detail views.

- [ ] **Step 1: Write failing pure search-decision tests**

Create `buildSearchResultEvents` tests:

```ts
assert.deepEqual(
  buildSearchResultEvents({ searchId: "s1", resultCount: 0 }),
  [
    { name: "search_results_viewed", payload: { searchId: "s1", resultCount: 0 } },
    { name: "search_no_results", payload: { searchId: "s1", resultCount: 0 } },
  ],
);
```

Assert nonzero results emit only `search_results_viewed`, and repeated React Query renders for the same search/result signature return no additional events through the deduplication helper.

- [ ] **Step 2: Run tests and verify RED**

Run `npm.cmd run test:analytics`.

Expected: FAIL because the search event helper does not exist.

- [ ] **Step 3: Implement search event helpers and wire both search entry points**

At actual search submission:

```ts
const searchId = analytics.createId();
void analytics.track("vehicle_searched", {
  searchId,
  searchLocation: normalizedLocation,
  pickupAt,
  dropoffAt,
  properties: { transmission, fuelType, seats },
});
```

Carry `searchId` through local state or route params. After a successful query, emit `search_results_viewed` with the count and `search_no_results` when count is zero. Do not emit result events for errors or intermediate loading data.

In `car-detail.tsx`, emit `vehicle_details_viewed` only after the requested vehicle successfully loads, once per mounted vehicle ID. Include an incoming `searchId` when available.

- [ ] **Step 4: Run tests and focused lint**

Run:

```powershell
npm.cmd run test:analytics
npx.cmd eslint lib/analytics/search-events.ts app/all-cars.tsx app/car-result.tsx app/car-detail.tsx
```

Expected: PASS with no duplicate-view or zero-result regressions.

- [ ] **Step 5: Commit discovery tracking**

```powershell
git add lib/analytics/search-events.ts lib/analytics/search-events.test.ts app/all-cars.tsx app/car-result.tsx app/car-detail.tsx
git commit -m "feat: track customer search and vehicle discovery"
```

---

### Task 5: Booking Attempt And KYC Instrumentation

**Files:**
- Modify: `D:\omkar\velorent-native\store\use-booking-store.ts`
- Modify: `D:\omkar\velorent-native\app\car-detail.tsx`
- Modify: `D:\omkar\velorent-native\app\verify-aadhaar.tsx`
- Modify: `D:\omkar\velorent-native\app\verify-driving-license.tsx`
- Create: `D:\omkar\velorent-native\lib\analytics\kyc-events.ts`
- Create: `D:\omkar\velorent-native\lib\analytics\kyc-events.test.ts`

**Interfaces:**
- Consumes: `analytics.track()`/`createId()` and booking store state.
- Produces: persistent `bookingAttemptId` for a booking flow and KYC start/failure behavioral events. Authoritative `kyc_completed` remains database-triggered.

- [ ] **Step 1: Write failing KYC classification and booking-attempt tests**

Test controlled mappings:

```ts
assert.equal(classifyKycFailure("digilocker_timeout"), "provider_timeout");
assert.equal(classifyKycFailure("manual_upload_rejected"), "upload_rejected");
assert.equal(classifyKycFailure("raw aadhaar payload"), "unknown_error");
```

Test that starting a new vehicle booking creates a booking attempt ID, navigation within that flow preserves it, and store reset removes it after confirmation or explicit abandonment.

- [ ] **Step 2: Run tests and verify RED**

Run `npm.cmd run test:analytics`.

Expected: FAIL for missing KYC helper/booking-attempt state.

- [ ] **Step 3: Implement and wire booking start**

Add `bookingAttemptId?: string`, `startBookingAttempt(vehicleId)`, and reset behavior to the existing booking store. When the authenticated customer taps Book Now in `car-detail.tsx`, create/persist the ID and emit:

```ts
void analytics.track("booking_started", {
  bookingAttemptId,
  vehicleId: car.id,
  searchId,
});
```

Do not emit when eligibility validation prevents entering the flow.

- [ ] **Step 4: Wire KYC behavioral events**

Emit `kyc_started` when DigiLocker actually launches or the first manual document upload begins, with `properties.documentType` and `properties.method`. Emit `kyc_failed` only on a terminal provider/submission error using controlled failure reasons. Do not emit personal/document content.

Do not emit client-side `kyc_completed`; the Task 1 database trigger owns aggregate completion after both required documents are verified.

- [ ] **Step 5: Run tests and focused lint**

Run:

```powershell
npm.cmd run test:analytics
npx.cmd eslint lib/analytics/kyc-events.ts store/use-booking-store.ts app/car-detail.tsx app/verify-aadhaar.tsx app/verify-driving-license.tsx
```

Expected: PASS and no sensitive values in captured test payloads.

- [ ] **Step 6: Commit booking/KYC tracking**

```powershell
git add lib/analytics/kyc-events.ts lib/analytics/kyc-events.test.ts store/use-booking-store.ts app/car-detail.tsx app/verify-aadhaar.tsx app/verify-driving-license.tsx
git commit -m "feat: track booking starts and KYC outcomes"
```

---

### Task 6: Cashfree Payment And Booking Outcome Instrumentation

**Files:**
- Modify: `D:\omkar\velorent-native\app\car-book\checkout.tsx`
- Create: `D:\omkar\velorent-native\lib\analytics\checkout-events.ts`
- Create: `D:\omkar\velorent-native\lib\analytics\checkout-events.test.ts`

**Interfaces:**
- Consumes: Event classifiers from Task 2, `analytics` from Task 3, and `bookingAttemptId` from Task 5.
- Produces: correlated Cashfree attempt events and client-side `booking_failed`; authoritative `booking_confirmed` remains database-triggered.

- [ ] **Step 1: Write failing checkout state-machine tests**

Use a pure reducer/helper to assert exact sequences:

```ts
test("Cashfree cancel emits only payment_cancelled", () => {
  assert.deepEqual(eventsForCheckoutOutcome({ code: "action_cancelled" }), [
    { name: "payment_cancelled", reason: "customer_cancelled" },
  ]);
});

test("verified payment followed by booking failure keeps both facts", () => {
  assert.deepEqual(eventsForBookingCreationFailure(), [
    "payment_successful",
    "booking_failed",
  ]);
});
```

Also test pending verification, non-cancel failure, success, and that terminal outcomes are mutually exclusive for one payment attempt.

- [ ] **Step 2: Run tests and verify RED**

Run `npm.cmd run test:analytics`.

Expected: FAIL because checkout event helpers do not exist.

- [ ] **Step 3: Instrument Cashfree order and callback boundaries**

Generate a new `paymentAttemptId` for every press that successfully creates a Cashfree order. Emit `payment_started` after order creation and immediately before opening checkout, including amount/currency, vehicle, booking attempt, and Cashfree order ID.

Map outcomes exactly:

```text
verifyCashfreeOrder(...).isPaid === true -> payment_successful
onError code === action_cancelled       -> payment_cancelled
onError any other code                  -> payment_failed
verification retries exhausted          -> payment_pending
```

Keep the original product behavior and alerts unchanged. Tracking calls are fire-and-forget and never replace backend payment verification.

- [ ] **Step 4: Track booking creation failure without duplicating authoritative success**

After verified payment, if `createBooking` fails, emit `booking_failed` with `failureReason: "creation_failed_after_payment"` and retain the same booking/payment attempt IDs. Do not emit client-side `booking_confirmed`; the Task 1 booking trigger owns it. Reset booking-attempt state only after confirmed booking or explicit flow reset.

- [ ] **Step 5: Run tests, lint, and Android bundle verification**

Run:

```powershell
npm.cmd run test:analytics
npx.cmd eslint lib/analytics app/car-book/checkout.tsx
npx.cmd expo export --platform android --output-dir .tmp-analytics-export --clear
```

Expected: all analytics tests and lint pass; Android production bundle completes and resolves all analytics modules. Remove only the verified `.tmp-analytics-export` directory afterward.

- [ ] **Step 6: Commit checkout tracking**

```powershell
git add lib/analytics/checkout-events.ts lib/analytics/checkout-events.test.ts app/car-book/checkout.tsx
git commit -m "feat: track Cashfree and booking outcomes"
```

---

### Task 7: End-To-End Contract Verification

**Files:**
- Create: `D:\omkar\velorent-native\docs\analytics-event-verification.md`

**Interfaces:**
- Consumes: Complete database and native analytics implementation.
- Produces: A repeatable development verification checklist and verified Phase 1 handoff.

- [ ] **Step 1: Write the verification checklist before manual execution**

Document the exact journey and expected event rows:

```text
Authenticated launch -> app_opened
Search with results -> vehicle_searched, search_results_viewed
Open vehicle -> vehicle_details_viewed
Tap Book Now -> booking_started
Start/finish both KYC docs -> kyc_started..., one kyc_completed trigger
Start and cancel Cashfree -> payment_started, payment_cancelled
Retry and pay -> payment_started, payment_successful, booking_confirmed trigger
Cancel booking -> booking_cancelled trigger
```

Include SQL that selects only non-sensitive columns by customer and occurrence time.

- [ ] **Step 2: Run the complete automated verification suite**

Admin repository:

```powershell
supabase test db supabase/tests/analytics_events_test.sql
npm.cmd run typecheck
npm.cmd run build
```

Native repository:

```powershell
npm.cmd run test:analytics
npx.cmd eslint lib/analytics app/_layout.tsx app/all-cars.tsx app/car-result.tsx app/car-detail.tsx app/verify-aadhaar.tsx app/verify-driving-license.tsx app/car-book/checkout.tsx store/use-booking-store.ts
npx.cmd tsc --noEmit
npx.cmd expo export --platform android --output-dir .tmp-analytics-export --clear
```

Expected: analytics tests, focused lint, database tests, admin build, and Android bundle pass. Report any unrelated pre-existing full-project failures by file and message; do not hide or fix unrelated changes.

- [ ] **Step 3: Perform privacy and event-contract audit**

Search event payload construction for prohibited keys and raw errors:

```powershell
rg -n -i 'email|phone|aadhaar|license_number|document|raw|error\.message' lib/analytics app/_layout.tsx app/all-cars.tsx app/car-result.tsx app/car-detail.tsx app/verify-aadhaar.tsx app/verify-driving-license.tsx app/car-book/checkout.tsx
```

Expected: matches are either controlled document-type labels or existing product logic outside analytics payloads; no prohibited data is passed to `analytics.track`.

- [ ] **Step 4: Execute the development checklist on Android**

Use one authenticated test customer. Confirm event order, correlation IDs, customer attribution, trigger deduplication, and that app behavior remains unchanged when analytics RPC access is temporarily denied.

- [ ] **Step 5: Commit verification documentation and any scoped fixes**

```powershell
git add docs/analytics-event-verification.md
git commit -m "docs: add analytics event verification guide"
```
