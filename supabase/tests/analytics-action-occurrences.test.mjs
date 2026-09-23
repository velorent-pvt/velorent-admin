// Runs against disposable PostgreSQL, never a linked Supabase database.
// Install @electric-sql/pglite in a temporary directory and set PGLITE_MODULE
// to its dist/index.js file URL, then run this file with node --test.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, test } from 'node:test';

const { PGlite } = await import(process.env.PGLITE_MODULE ?? '@electric-sql/pglite');
const db = new PGlite();
after(() => db.close());

// Only the columns used by these RPCs are needed in the isolated fixture.
await db.exec(`
  create role anon;
  create role authenticated;
  create schema auth;
  create function auth.uid() returns uuid language sql as $$
    select nullif(current_setting('test.user_id', true), '')::uuid
  $$;
  create table profiles (id uuid primary key, full_name text, email text, phone text,
    avatar_url text, role_id integer, created_at timestamptz default '2025-01-01T00:00:00Z');
  create table customers (id uuid primary key, aadhaar_name text, aadhaar_number text,
    dl_name text, dl_number text);
  create table bookings (id uuid primary key, customer_id uuid, car_id uuid);
  create table cars (id uuid primary key, brand_id uuid, model_id uuid, registration_number text);
  create table car_brands (id uuid primary key, name text);
  create table car_models (id uuid primary key, name text);
  create type analytics_event_name as enum ('app_opened', 'vehicle_searched',
    'search_results_viewed', 'vehicle_details_viewed', 'booking_started', 'kyc_started',
    'kyc_completed', 'payment_started', 'payment_successful', 'payment_failed',
    'payment_pending', 'payment_cancelled', 'booking_confirmed');
  create table analytics_events (id uuid primary key default gen_random_uuid(),
    event_name analytics_event_name, customer_id uuid, occurred_at timestamptz,
    received_at timestamptz default now(), payment_attempt_id uuid, vehicle_id uuid, booking_id uuid);
  insert into profiles (id, full_name, role_id) values
    ('00000000-0000-0000-0000-000000000001', 'Admin', 1),
    ('00000000-0000-0000-0000-000000000002', 'Repeat customer', 3);
  set test.user_id = '00000000-0000-0000-0000-000000000001';
  insert into cars (id, registration_number) values
    ('00000000-0000-0000-0000-000000000010', 'CAR-A'),
    ('00000000-0000-0000-0000-000000000011', 'CAR-B');
`);

const migration = await readFile(new URL('../migrations/20260923090000_analytics_action_occurrences.sql', import.meta.url), 'utf8');
await db.exec(migration);

const customer = '00000000-0000-0000-0000-000000000002';
const carA = '00000000-0000-0000-0000-000000000010';
const carB = '00000000-0000-0000-0000-000000000011';
const attemptA = '00000000-0000-0000-0000-000000000020';
const attemptB = '00000000-0000-0000-0000-000000000021';
const attemptC = '00000000-0000-0000-0000-000000000022';

async function event(name, time, vehicle = null, attempt = null) {
  await db.query(`insert into analytics_events
    (event_name, customer_id, occurred_at, vehicle_id, payment_attempt_id)
    values ($1, $2, $3, $4, $5)`, [name, customer, time, vehicle, attempt]);
}

for (const day of ['22', '23']) {
  await event('app_opened', `2026-09-${day}T08:00:00Z`);
  await event('app_opened', `2026-09-${day}T09:00:00Z`);
  for (const [index, name] of ['vehicle_searched', 'search_results_viewed',
    'vehicle_details_viewed', 'booking_started', 'kyc_started', 'kyc_completed',
    'payment_started', 'payment_successful', 'booking_confirmed'].entries()) {
    await event(name, `2026-09-${day}T10:${String(index).padStart(2, '0')}:00Z`,
      day === '22' ? carA : carB);
  }
}
await event('app_opened', '2026-09-24T00:00:00Z');
await event('payment_started', '2026-09-22T12:00:00Z', carA, attemptA);
await event('payment_started', '2026-09-22T12:01:00Z', carA, attemptA);
await event('payment_failed', '2026-09-22T12:02:00Z', carA, attemptA);
await event('payment_successful', '2026-09-22T12:03:00Z', carA, attemptA);
await event('payment_started', '2026-09-23T12:00:00Z', carB, attemptB);
await event('payment_successful', '2026-09-23T12:02:00Z', carB, attemptB);
await event('payment_started', '2026-09-23T13:00:00Z', null, attemptC);
await event('payment_cancelled', '2026-09-23T13:02:00Z', null, attemptC);

const start = '2026-09-22T00:00:00Z';
const end = '2026-09-24T00:00:00Z';
const funnel = async (stage, from = start) => (await db.query(
  'select * from get_customer_funnel_stage_actions($1, $2, $3)', [from, end, stage],
)).rows;
const payments = async (metric) => (await db.query(
  'select * from get_payment_analytics_actions($1, $2, $3)', [start, end, metric],
)).rows;

test('same-day and cross-day app opens remain separate, newest first, with exclusive end', async () => {
  const rows = await funnel(1);
  assert.equal(rows.length, 4);
  assert.equal(new Set(rows.map(row => row.id)).size, 1);
  assert.equal(new Set(rows.map(row => row.action_id)).size, 4);
  assert.deepEqual(rows.map(row => row.action_at.toISOString()), [
    '2026-09-23T09:00:00.000Z', '2026-09-23T08:00:00.000Z',
    '2026-09-22T09:00:00.000Z', '2026-09-22T08:00:00.000Z',
  ]);
  assert.equal(rows[0].created_at.toISOString(), '2025-01-01T00:00:00.000Z');
  assert.equal((await funnel(1, '2026-09-23T00:00:00Z')).length, 2);
});

test('every funnel stage preserves repeated actions and occurrence-specific vehicles', async () => {
  for (const stage of [2, 3, 4, 5, 6, 7, 10]) {
    const rows = await funnel(stage);
    assert.equal(rows.length, 2, `stage ${stage}`);
    assert.equal(rows[0].vehicles[0].id, carB);
    assert.equal(rows[1].vehicles[0].id, carA);
    assert.ok(rows[0].action_at > rows[1].action_at);
  }
  assert.equal((await funnel(8)).length, 6);
  assert.equal((await funnel(9)).length, 4);
});

test('payment attempts stay separate while retries/status events within an attempt do not multiply rows', async () => {
  const rows = await payments('total_attempts');
  assert.deepEqual(rows.map(row => row.action_id), [attemptC, attemptB, attemptA]);
  assert.deepEqual(rows[0].vehicles, []);
  assert.equal(rows[1].vehicles[0].id, carB);
  assert.equal(rows[2].vehicles[0].id, carA);
  assert.equal(rows[2].action_at.toISOString(), '2026-09-22T12:00:00.000Z');
  const successful = await payments('successful');
  assert.deepEqual(successful.map(row => row.action_id), [attemptB, attemptA]);
  assert.equal(successful[0].action_at.toISOString(), '2026-09-23T12:02:00.000Z');
  assert.equal((await payments('failed')).length, 0);
  assert.equal((await payments('cancelled')).length, 1);
});

test('invalid ranges and unauthorized users are rejected', async () => {
  await assert.rejects(db.query('select * from get_customer_funnel_stage_actions($1,$2,1)', [end, start]), /invalid_date_range/);
  await assert.rejects(payments('unknown'), /invalid_metric_key/);
  await db.exec(`set test.user_id = '${customer}'`);
  try {
    await assert.rejects(funnel(1), /admin_access_required/);
    await assert.rejects(payments('total_attempts'), /admin_access_required/);
  } finally {
    await db.exec("set test.user_id = '00000000-0000-0000-0000-000000000001'");
  }
});
