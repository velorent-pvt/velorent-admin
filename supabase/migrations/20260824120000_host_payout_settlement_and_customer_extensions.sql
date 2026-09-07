-- Persist the final payout as an immutable settlement snapshot.  The legacy
-- generated host_earnings_amount remains for backwards compatibility.
alter table public.host_payouts
  add column if not exists base_payout_amount numeric(10,2),
  add column if not exists extra_distance_charge numeric(10,2) not null default 0,
  add column if not exists extra_distance_host_share numeric(10,2) not null default 0,
  add column if not exists overstay_charge numeric(10,2) not null default 0,
  add column if not exists overstay_host_share numeric(10,2) not null default 0,
  add column if not exists settlement_amount numeric(10,2),
  add column if not exists settlement_calculated_at timestamptz;

update public.host_payouts
set base_payout_amount = coalesce(base_payout_amount, host_earnings_amount),
    settlement_amount = coalesce(settlement_amount, host_earnings_amount)
where base_payout_amount is null or settlement_amount is null;

alter table public.host_payouts
  alter column base_payout_amount set default 0,
  alter column settlement_amount set default 0;

create table if not exists public.booking_extensions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  original_end_time timestamptz not null,
  requested_end_time timestamptz not null,
  added_hours integer not null check (added_hours > 0),
  hourly_rate numeric(10,2) not null check (hourly_rate >= 0),
  amount numeric(10,2) not null check (amount > 0),
  status text not null default 'quoted' check (status in ('quoted', 'paid', 'cancelled', 'expired')),
  gateway_order_id text unique,
  gateway_payment_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requested_end_time > original_end_time)
);

create index if not exists idx_booking_extensions_booking_id on public.booking_extensions(booking_id);

create or replace function public.quote_customer_booking_extension(
  p_booking_id uuid,
  p_requested_end_time timestamptz
)
returns public.booking_extensions
language plpgsql security definer set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_extension public.booking_extensions%rowtype;
  v_added_hours integer;
  v_hourly_rate numeric;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if auth.uid() is null or v_booking.customer_id <> auth.uid() then
    raise exception 'You can only extend your own booking';
  end if;
  if v_booking.status <> 'ongoing' then
    raise exception 'Only an ongoing trip can be extended';
  end if;
  if p_requested_end_time <= v_booking.end_time then
    raise exception 'Choose a time after the current trip end';
  end if;
  if p_requested_end_time > v_booking.end_time + interval '30 days' then
    raise exception 'A trip can be extended by a maximum of 30 days';
  end if;
  if exists (
    select 1 from public.bookings b
    where b.car_id = v_booking.car_id and b.id <> v_booking.id
      and b.status in ('pending', 'confirmed', 'ongoing')
      and b.start_time < p_requested_end_time and b.end_time > v_booking.end_time
  ) or exists (
    select 1 from public.car_availability a
    where a.car_id = v_booking.car_id
      and a.reason is distinct from ('booking:' || v_booking.id::text)
      and a.start_time < p_requested_end_time and a.end_time > v_booking.end_time
  ) then
    raise exception 'The car is unavailable for the requested extension period';
  end if;
  v_added_hours := ceiling(extract(epoch from (p_requested_end_time - v_booking.end_time)) / 3600.0)::integer;
  v_hourly_rate := case when v_booking.total_hours > 0 then round(v_booking.base_amount / v_booking.total_hours, 2) else 0 end;
  if v_hourly_rate <= 0 then raise exception 'Unable to calculate the extension price'; end if;
  insert into public.booking_extensions (booking_id, customer_id, original_end_time, requested_end_time, added_hours, hourly_rate, amount)
  values (v_booking.id, v_booking.customer_id, v_booking.end_time, p_requested_end_time, v_added_hours, v_hourly_rate, round(v_added_hours * v_hourly_rate, 2))
  returning * into v_extension;
  return v_extension;
end;
$$;

create or replace function public.complete_customer_booking_extension(
  p_extension_id uuid,
  p_gateway_order_id text,
  p_gateway_payment_id text default null
)
returns public.bookings
language plpgsql security definer set search_path = public
as $$
declare
  v_extension public.booking_extensions%rowtype;
  v_booking public.bookings%rowtype;
  v_total_hours integer;
  v_base_amount numeric;
  v_commission_amount numeric;
begin
  select * into v_extension from public.booking_extensions where id = p_extension_id for update;
  if not found then raise exception 'Extension quote not found'; end if;
  if auth.uid() is null or v_extension.customer_id <> auth.uid() then raise exception 'Not authorised'; end if;
  if v_extension.status = 'paid' then
    select * into v_booking from public.bookings where id = v_extension.booking_id;
    return v_booking;
  end if;
  if v_extension.status <> 'quoted' then raise exception 'This extension quote is no longer valid'; end if;
  select * into v_booking from public.bookings where id = v_extension.booking_id for update;
  if v_booking.status <> 'ongoing' or v_booking.end_time <> v_extension.original_end_time then
    raise exception 'The trip changed; request a new extension quote';
  end if;
  if trim(coalesce(p_gateway_order_id, '')) = '' then raise exception 'Payment reference is required'; end if;
  v_total_hours := ceiling(extract(epoch from (v_extension.requested_end_time - v_booking.start_time)) / 3600.0)::integer;
  v_base_amount := round(v_booking.base_amount + v_extension.amount, 2);
  v_commission_amount := round(v_base_amount * v_booking.commission_percentage / 100.0, 2);
  update public.bookings set end_time = v_extension.requested_end_time, total_hours = v_total_hours,
    base_amount = v_base_amount, commission_amount = v_commission_amount,
    total_amount = v_base_amount + coalesce(delivery_amount, 0) + coalesce(deposit_amount, 0), updated_at = now()
  where id = v_booking.id returning * into v_booking;
  update public.car_availability set end_time = v_extension.requested_end_time, updated_at = now()
  where reason = ('booking:' || v_booking.id::text);
  update public.booking_extensions set status = 'paid', gateway_order_id = trim(p_gateway_order_id),
    gateway_payment_id = nullif(trim(coalesce(p_gateway_payment_id, '')), ''), paid_at = now(), updated_at = now()
  where id = v_extension.id;
  perform public.enqueue_push_notification(v_booking.customer_id, 'Trip extended', 'Your trip has been extended successfully.', '/bookings/' || v_booking.id::text, 'velorent://bookings/' || v_booking.id::text);
  perform public.enqueue_push_notification(v_booking.host_id, 'Trip extended', 'A customer extended booking #' || upper(right(v_booking.id::text, 8)) || '.', '/bookings/' || v_booking.id::text, 'velorent-host://bookings/' || v_booking.id::text);
  return v_booking;
end;
$$;

-- Queue one reminder per ongoing trip; the existing job worker delivers it.
create or replace function public.schedule_booking_expiry_reminder()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.status = 'ongoing' then
    delete from public.push_notification_jobs
    where user_id = new.customer_id
      and title = 'Trip ending soon'
      and deeplink = ('velorent://bookings/' || new.id::text)
      and status = 'queued';
    perform public.enqueue_push_notification(new.customer_id, 'Trip ending soon', 'Your trip ends in about an hour. Extend it from booking details if you need more time.', '/bookings/' || new.id::text, 'velorent://bookings/' || new.id::text, null, greatest(now(), new.end_time - interval '1 hour'));
  end if;
  return new;
end;
$$;
drop trigger if exists booking_expiry_reminder on public.bookings;
create trigger booking_expiry_reminder after insert or update of status, end_time on public.bookings
for each row execute function public.schedule_booking_expiry_reminder();

grant execute on function public.quote_customer_booking_extension(uuid, timestamptz) to authenticated;
grant execute on function public.complete_customer_booking_extension(uuid, text, text) to authenticated;
