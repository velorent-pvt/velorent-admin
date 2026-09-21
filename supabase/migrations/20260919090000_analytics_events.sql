do $$
begin
  create type public.analytics_event_name as enum (
    'app_opened',
    'vehicle_searched',
    'search_results_viewed',
    'search_no_results',
    'vehicle_details_viewed',
    'booking_started',
    'booking_failed',
    'kyc_started',
    'kyc_completed',
    'kyc_failed',
    'payment_started',
    'payment_successful',
    'payment_failed',
    'payment_pending',
    'payment_cancelled',
    'booking_confirmed',
    'booking_cancelled'
  );
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name public.analytics_event_name not null,
  occurred_at timestamptz not null default now(),
  received_at timestamptz not null default now(),
  idempotency_key text not null unique,
  customer_id uuid not null,
  search_id uuid,
  booking_attempt_id uuid,
  payment_attempt_id uuid,
  vehicle_id uuid references public.cars(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  cashfree_order_id text,
  search_location text,
  pickup_at timestamptz,
  dropoff_at timestamptz,
  result_count integer,
  amount numeric(12, 2),
  currency text,
  platform text not null default 'android',
  app_version text,
  failure_reason text,
  cancellation_reason text,
  properties jsonb not null default '{}'::jsonb,
  constraint analytics_events_idempotency_key_length
    check (char_length(idempotency_key) between 8 and 160),
  constraint analytics_events_result_count_nonnegative
    check (result_count is null or result_count >= 0),
  constraint analytics_events_amount_nonnegative
    check (amount is null or amount >= 0),
  constraint analytics_events_time_range
    check (dropoff_at is null or pickup_at is null or dropoff_at > pickup_at),
  constraint analytics_events_platform_android
    check (platform = 'android'),
  constraint analytics_events_properties_object
    check (jsonb_typeof(properties) = 'object'),
  constraint analytics_events_bounded_text
    check (
      char_length(coalesce(cashfree_order_id, '')) <= 160
      and char_length(coalesce(search_location, '')) <= 160
      and char_length(coalesce(currency, '')) <= 8
      and char_length(coalesce(app_version, '')) <= 40
      and char_length(coalesce(failure_reason, '')) <= 80
      and char_length(coalesce(cancellation_reason, '')) <= 80
    )
);

create index if not exists analytics_events_event_date_idx
  on public.analytics_events (event_name, occurred_at desc);
create index if not exists analytics_events_customer_date_idx
  on public.analytics_events (customer_id, occurred_at desc);
create index if not exists analytics_events_vehicle_date_idx
  on public.analytics_events (vehicle_id, occurred_at desc)
  where vehicle_id is not null;
create index if not exists analytics_events_search_idx
  on public.analytics_events (search_id)
  where search_id is not null;
create index if not exists analytics_events_booking_idx
  on public.analytics_events (booking_id)
  where booking_id is not null;
create index if not exists analytics_events_booking_attempt_idx
  on public.analytics_events (booking_attempt_id)
  where booking_attempt_id is not null;
create index if not exists analytics_events_payment_attempt_idx
  on public.analytics_events (payment_attempt_id)
  where payment_attempt_id is not null;
create index if not exists analytics_events_cashfree_order_idx
  on public.analytics_events (cashfree_order_id)
  where cashfree_order_id is not null;
create index if not exists analytics_events_search_location_idx
  on public.analytics_events (lower(search_location), occurred_at desc)
  where search_location is not null;

alter table public.analytics_events enable row level security;
revoke all on table public.analytics_events from anon, authenticated;

create or replace function public.analytics_properties_are_safe(
  p_value jsonb,
  p_depth integer default 0
)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  v_key text;
  v_child jsonb;
  v_prohibited_keys constant text[] := array[
    'email', 'phone', 'phone_number', 'address', 'aadhaar', 'aadhaar_number',
    'dl_number', 'driving_license', 'license_number', 'document',
    'document_url', 'image', 'image_url', 'payment_credentials', 'raw',
    'error', 'error_message'
  ];
begin
  if p_depth > 4 then
    return false;
  end if;

  if p_depth = 0 and octet_length(p_value::text) > 8192 then
    return false;
  end if;

  if jsonb_typeof(p_value) = 'object' then
    for v_key, v_child in select key, value from jsonb_each(p_value)
    loop
      if lower(v_key) = any(v_prohibited_keys) then
        return false;
      end if;
      if jsonb_typeof(v_child) in ('object', 'array')
        and not public.analytics_properties_are_safe(v_child, p_depth + 1) then
        return false;
      end if;
    end loop;
  elsif jsonb_typeof(p_value) = 'array' then
    for v_child in select value from jsonb_array_elements(p_value)
    loop
      if jsonb_typeof(v_child) in ('object', 'array')
        and not public.analytics_properties_are_safe(v_child, p_depth + 1) then
        return false;
      end if;
    end loop;
  end if;

  return true;
end;
$$;

revoke all on function public.analytics_properties_are_safe(jsonb, integer)
  from public, anon, authenticated;

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
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid := auth.uid();
  v_event_id uuid;
  v_properties jsonb := coalesce(p_properties, '{}'::jsonb);
begin
  if v_customer_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = v_customer_id) then
    raise exception 'customer_not_found' using errcode = '23503';
  end if;

  if p_idempotency_key is null
    or char_length(p_idempotency_key) not between 8 and 160 then
    raise exception 'invalid_idempotency_key' using errcode = '22023';
  end if;

  if p_occurred_at < now() - interval '7 days'
    or p_occurred_at > now() + interval '5 minutes' then
    raise exception 'invalid_occurred_at' using errcode = '22023';
  end if;

  if p_result_count is not null and p_result_count < 0 then
    raise exception 'invalid_result_count' using errcode = '22023';
  end if;

  if p_amount is not null and p_amount < 0 then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;

  if p_dropoff_at is not null and p_pickup_at is not null
    and p_dropoff_at <= p_pickup_at then
    raise exception 'invalid_booking_window' using errcode = '22023';
  end if;

  if jsonb_typeof(v_properties) <> 'object'
    or not public.analytics_properties_are_safe(v_properties) then
    raise exception 'invalid_properties' using errcode = '22023';
  end if;

  if p_event_name in ('vehicle_searched', 'search_results_viewed', 'search_no_results')
    and p_search_id is null then
    raise exception 'search_id_required' using errcode = '22023';
  end if;

  if p_event_name in ('search_results_viewed', 'search_no_results')
    and p_result_count is null then
    raise exception 'result_count_required' using errcode = '22023';
  end if;

  if p_event_name = 'search_no_results' and p_result_count <> 0 then
    raise exception 'zero_result_count_required' using errcode = '22023';
  end if;

  if p_event_name in ('vehicle_details_viewed', 'booking_started', 'booking_failed')
    and p_vehicle_id is null then
    raise exception 'vehicle_id_required' using errcode = '22023';
  end if;

  if p_event_name in ('booking_started', 'booking_failed')
    and p_booking_attempt_id is null then
    raise exception 'booking_attempt_id_required' using errcode = '22023';
  end if;

  if p_event_name in (
    'payment_started', 'payment_successful', 'payment_failed',
    'payment_pending', 'payment_cancelled'
  ) and p_payment_attempt_id is null then
    raise exception 'payment_attempt_id_required' using errcode = '22023';
  end if;

  insert into public.analytics_events (
    event_name,
    occurred_at,
    idempotency_key,
    customer_id,
    search_id,
    booking_attempt_id,
    payment_attempt_id,
    vehicle_id,
    booking_id,
    cashfree_order_id,
    search_location,
    pickup_at,
    dropoff_at,
    result_count,
    amount,
    currency,
    app_version,
    failure_reason,
    cancellation_reason,
    properties
  ) values (
    p_event_name,
    p_occurred_at,
    p_idempotency_key,
    v_customer_id,
    p_search_id,
    p_booking_attempt_id,
    p_payment_attempt_id,
    p_vehicle_id,
    p_booking_id,
    nullif(trim(p_cashfree_order_id), ''),
    nullif(lower(trim(p_search_location)), ''),
    p_pickup_at,
    p_dropoff_at,
    p_result_count,
    p_amount,
    upper(nullif(trim(p_currency), '')),
    nullif(trim(p_app_version), ''),
    nullif(lower(trim(p_failure_reason)), ''),
    nullif(lower(trim(p_cancellation_reason)), ''),
    v_properties
  )
  on conflict (idempotency_key) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    select id
    into v_event_id
    from public.analytics_events
    where idempotency_key = p_idempotency_key
      and customer_id = v_customer_id;

    if v_event_id is null then
      raise exception 'idempotency_key_conflict' using errcode = '23505';
    end if;
  end if;

  return v_event_id;
end;
$$;

revoke all on function public.track_analytics_event(
  public.analytics_event_name, text, timestamptz, uuid, uuid, uuid, uuid,
  uuid, text, text, timestamptz, timestamptz, integer, numeric, text, text,
  text, text, jsonb
) from public, anon;
grant execute on function public.track_analytics_event(
  public.analytics_event_name, text, timestamptz, uuid, uuid, uuid, uuid,
  uuid, text, text, timestamptz, timestamptz, integer, numeric, text, text,
  text, text, jsonb
) to authenticated;

create or replace function public.capture_booking_analytics_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_name public.analytics_event_name;
  v_key text;
begin
  if new.status = 'confirmed'
    and (tg_op = 'INSERT' or old.status is distinct from 'confirmed') then
    v_event_name := 'booking_confirmed';
    v_key := format('booking:%s:confirmed', new.id);
  elsif new.status = 'cancelled'
    and (tg_op = 'INSERT' or old.status is distinct from 'cancelled') then
    v_event_name := 'booking_cancelled';
    v_key := format('booking:%s:cancelled', new.id);
  else
    return new;
  end if;

  begin
    insert into public.analytics_events (
      event_name,
      occurred_at,
      idempotency_key,
      customer_id,
      vehicle_id,
      booking_id,
      amount,
      currency,
      properties
    ) values (
      v_event_name,
      coalesce(new.updated_at, now()),
      v_key,
      new.customer_id,
      new.car_id,
      new.id,
      new.total_amount,
      'INR',
      jsonb_build_object('source', 'database_trigger')
    ) on conflict (idempotency_key) do nothing;
  exception
    when others then
      raise warning 'booking analytics capture failed for %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists capture_booking_analytics_event on public.bookings;
create trigger capture_booking_analytics_event
after insert or update of status on public.bookings
for each row execute function public.capture_booking_analytics_event();

create or replace function public.capture_customer_kyc_analytics_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_complete boolean;
  v_was_complete boolean := false;
begin
  v_is_complete :=
    nullif(trim(new.aadhaar_number), '') is not null
    and nullif(trim(new.aadhaar_name), '') is not null
    and nullif(trim(new.aadhaar_address), '') is not null
    and nullif(trim(new.dl_number), '') is not null;

  if tg_op = 'UPDATE' then
    v_was_complete :=
      nullif(trim(old.aadhaar_number), '') is not null
      and nullif(trim(old.aadhaar_name), '') is not null
      and nullif(trim(old.aadhaar_address), '') is not null
      and nullif(trim(old.dl_number), '') is not null;
  end if;

  if not v_is_complete or v_was_complete then
    return new;
  end if;

  begin
    insert into public.analytics_events (
      event_name,
      idempotency_key,
      customer_id,
      properties
    ) values (
      'kyc_completed',
      format('customer:%s:kyc_completed', new.id),
      new.id,
      jsonb_build_object('source', 'database_trigger')
    ) on conflict (idempotency_key) do nothing;
  exception
    when others then
      raise warning 'KYC analytics capture failed for %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists capture_customer_kyc_analytics_event on public.customers;
create trigger capture_customer_kyc_analytics_event
after insert or update of aadhaar_number, aadhaar_name, aadhaar_address, dl_number
on public.customers
for each row execute function public.capture_customer_kyc_analytics_event();

revoke all on function public.capture_booking_analytics_event() from public, anon, authenticated;
revoke all on function public.capture_customer_kyc_analytics_event() from public, anon, authenticated;
