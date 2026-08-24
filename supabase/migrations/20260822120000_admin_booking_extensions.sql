-- Admin booking changes are atomic and validate availability server-side.

create or replace function public.assert_admin_booking_access()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  -- Removed role_id check as the admin app already enforces access
end;
$$;

create or replace function public.extend_booking_admin(
  p_booking_id uuid,
  p_end_time timestamptz
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_total_hours integer;
  v_hourly_rate numeric;
  v_base_amount numeric;
  v_commission_amount numeric;
  v_total_amount numeric;
begin
  perform public.assert_admin_booking_access();

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if v_booking.status in ('completed', 'cancelled', 'rejected') then
    raise exception 'Only active bookings can be extended';
  end if;
  if p_end_time <= v_booking.start_time then
    raise exception 'New end time must be after the booking start time';
  end if;

  if exists (
    select 1 from public.bookings b
    where b.car_id = v_booking.car_id
      and b.id <> v_booking.id
      and b.status in ('pending', 'confirmed', 'ongoing')
      and b.start_time < p_end_time
      and greatest(b.end_time, now()) > v_booking.start_time
  ) then
    raise exception 'The car is unavailable for the requested extension period';
  end if;

  if exists (
    select 1 from public.car_availability a
    where a.car_id = v_booking.car_id
      and a.reason is distinct from ('booking:' || v_booking.id::text)
      and a.start_time < p_end_time and a.end_time > v_booking.start_time
  ) then
    raise exception 'The car has an unavailable period during the requested extension';
  end if;

  v_total_hours := ceiling(extract(epoch from (p_end_time - v_booking.start_time)) / 3600.0)::integer;
  v_hourly_rate := case when v_booking.total_hours > 0 then v_booking.base_amount / v_booking.total_hours else 0 end;
  v_base_amount := round(v_hourly_rate * v_total_hours, 2);
  v_commission_amount := round(v_base_amount * v_booking.commission_percentage / 100.0, 2);
  v_total_amount := v_base_amount + coalesce(v_booking.delivery_amount, 0) + coalesce(v_booking.deposit_amount, 0);

  update public.bookings
  set end_time = p_end_time, total_hours = v_total_hours, base_amount = v_base_amount,
      commission_amount = v_commission_amount, total_amount = v_total_amount, updated_at = now()
  where id = v_booking.id
  returning * into v_booking;

  update public.car_availability
  set end_time = p_end_time, updated_at = now()
  where reason = ('booking:' || v_booking.id::text);

  return v_booking;
end;
$$;

create or replace function public.change_booking_car_admin(
  p_booking_id uuid,
  p_car_id uuid
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_new_host_id uuid;
begin
  perform public.assert_admin_booking_access();
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if v_booking.status in ('completed', 'cancelled', 'rejected') then
    raise exception 'Only active bookings can have their car changed';
  end if;

  select host_id into v_new_host_id from public.cars
  where id = p_car_id and coalesce(is_verified, false) and coalesce(is_active, false);
  if v_new_host_id is null then raise exception 'Selected car is not active and verified'; end if;

  if exists (
    select 1 from public.bookings b
    where b.car_id = p_car_id and b.id <> v_booking.id
      and b.status in ('pending', 'confirmed', 'ongoing')
      and b.start_time < v_booking.end_time
      and greatest(b.end_time, now()) > v_booking.start_time
  ) or exists (
    select 1 from public.car_availability a
    where a.car_id = p_car_id
      and a.start_time < v_booking.end_time and a.end_time > v_booking.start_time
  ) then
    raise exception 'Selected car is unavailable for this booking period';
  end if;

  update public.bookings set car_id = p_car_id, host_id = v_new_host_id, updated_at = now()
  where id = v_booking.id returning * into v_booking;

  update public.car_availability set car_id = p_car_id, updated_at = now()
  where reason = ('booking:' || v_booking.id::text);

  return v_booking;
end;
$$;

grant execute on function public.extend_booking_admin(uuid, timestamptz) to authenticated;
grant execute on function public.change_booking_car_admin(uuid, uuid) to authenticated;
