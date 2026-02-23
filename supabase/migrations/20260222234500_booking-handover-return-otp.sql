alter table public.bookings
  add column if not exists handover_otp text,
  add column if not exists handover_otp_generated_at timestamptz,
  add column if not exists handover_otp_verified_at timestamptz;

alter table public.bookings
  drop constraint if exists bookings_handover_otp_check;

alter table public.bookings
  add constraint bookings_handover_otp_check
  check (handover_otp is null or handover_otp ~ '^[0-9]{6}$');

create or replace function public.generate_booking_handover_otp()
returns text
language sql
as $$
  select lpad((floor(random() * 1000000)::int)::text, 6, '0');
$$;

create or replace function public.set_booking_handover_otp()
returns trigger
language plpgsql
as $$
begin
  if new.handover_otp is null or new.handover_otp !~ '^[0-9]{6}$' then
    new.handover_otp := public.generate_booking_handover_otp();
  end if;

  if new.handover_otp_generated_at is null then
    new.handover_otp_generated_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_set_booking_handover_otp on public.bookings;
create trigger trg_set_booking_handover_otp
before insert on public.bookings
for each row
execute function public.set_booking_handover_otp();

update public.bookings b
set handover_otp = public.generate_booking_handover_otp(),
    handover_otp_generated_at = coalesce(b.created_at, now())
where b.handover_otp is null
   or b.handover_otp !~ '^[0-9]{6}$';

create table if not exists public.booking_handover_details (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  start_odometer_km integer not null check (start_odometer_km >= 0),
  odometer_proof_url text not null,
  customer_photo_url text not null,
  handover_proof_url text not null,
  checklist jsonb not null default '[]'::jsonb,
  verified_otp text not null check (verified_otp ~ '^[0-9]{6}$'),
  created_at timestamptz not null default now(),
  constraint booking_handover_checklist_array
    check (jsonb_typeof(checklist) = 'array')
);

create index if not exists idx_booking_handover_booking_id
  on public.booking_handover_details(booking_id);

create index if not exists idx_booking_handover_host_id
  on public.booking_handover_details(host_id);

create table if not exists public.booking_return_details (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  end_odometer_km integer not null check (end_odometer_km >= 0),
  odometer_proof_url text not null,
  return_proof_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_booking_return_booking_id
  on public.booking_return_details(booking_id);

create index if not exists idx_booking_return_host_id
  on public.booking_return_details(host_id);

create or replace function public.confirm_booking_handover(
  p_booking_id uuid,
  p_entered_otp text,
  p_start_odometer_km integer,
  p_odometer_proof_url text,
  p_customer_photo_url text,
  p_handover_proof_url text,
  p_checklist jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_user_id uuid := auth.uid();
  v_checklist jsonb := case
    when jsonb_typeof(coalesce(p_checklist, '[]'::jsonb)) = 'array'
      then coalesce(p_checklist, '[]'::jsonb)
    else '[]'::jsonb
  end;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_start_odometer_km is null or p_start_odometer_km < 0 then
    raise exception 'Start odometer must be a valid number';
  end if;

  if trim(coalesce(p_entered_otp, '')) !~ '^[0-9]{6}$' then
    raise exception 'Enter a valid 6-digit OTP';
  end if;

  if trim(coalesce(p_odometer_proof_url, '')) = '' then
    raise exception 'Odometer proof is required';
  end if;

  if trim(coalesce(p_customer_photo_url, '')) = '' then
    raise exception 'Customer photo is required';
  end if;

  if trim(coalesce(p_handover_proof_url, '')) = '' then
    raise exception 'Handover proof is required';
  end if;

  select *
  into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'Booking not found';
  end if;

  if v_booking.host_id <> v_user_id then
    raise exception 'You can only handover your own booking';
  end if;

  if v_booking.status not in ('pending', 'confirmed') then
    raise exception 'Booking is not ready for handover';
  end if;

  if exists (
    select 1
    from public.booking_handover_details bh
    where bh.booking_id = v_booking.id
  ) then
    raise exception 'Handover already completed';
  end if;

  if v_booking.handover_otp is null or v_booking.handover_otp !~ '^[0-9]{6}$' then
    update public.bookings
    set handover_otp = public.generate_booking_handover_otp(),
        handover_otp_generated_at = now()
    where id = v_booking.id
    returning * into v_booking;
  end if;

  if trim(p_entered_otp) <> v_booking.handover_otp then
    raise exception 'Invalid OTP';
  end if;

  insert into public.booking_handover_details (
    booking_id,
    host_id,
    customer_id,
    start_odometer_km,
    odometer_proof_url,
    customer_photo_url,
    handover_proof_url,
    checklist,
    verified_otp
  )
  values (
    v_booking.id,
    v_booking.host_id,
    v_booking.customer_id,
    p_start_odometer_km,
    trim(p_odometer_proof_url),
    trim(p_customer_photo_url),
    trim(p_handover_proof_url),
    v_checklist,
    trim(p_entered_otp)
  );

  update public.bookings
  set status = 'ongoing',
      handover_otp_verified_at = now(),
      updated_at = now()
  where id = v_booking.id;

  return jsonb_build_object(
    'booking_id', v_booking.id,
    'status', 'ongoing'
  );
end;
$$;

create or replace function public.confirm_booking_return(
  p_booking_id uuid,
  p_end_odometer_km integer,
  p_odometer_proof_url text,
  p_return_proof_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_end_odometer_km is null or p_end_odometer_km < 0 then
    raise exception 'End odometer must be a valid number';
  end if;

  if trim(coalesce(p_odometer_proof_url, '')) = '' then
    raise exception 'Return odometer proof is required';
  end if;

  if trim(coalesce(p_return_proof_url, '')) = '' then
    raise exception 'Return proof photo is required';
  end if;

  select *
  into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'Booking not found';
  end if;

  if v_booking.host_id <> v_user_id then
    raise exception 'You can only return your own booking';
  end if;

  if v_booking.status <> 'ongoing' then
    raise exception 'Booking is not ongoing';
  end if;

  if exists (
    select 1
    from public.booking_return_details br
    where br.booking_id = v_booking.id
  ) then
    raise exception 'Return already completed';
  end if;

  insert into public.booking_return_details (
    booking_id,
    host_id,
    customer_id,
    end_odometer_km,
    odometer_proof_url,
    return_proof_url
  )
  values (
    v_booking.id,
    v_booking.host_id,
    v_booking.customer_id,
    p_end_odometer_km,
    trim(p_odometer_proof_url),
    trim(p_return_proof_url)
  );

  update public.bookings
  set status = 'completed',
      updated_at = now()
  where id = v_booking.id;

  return jsonb_build_object(
    'booking_id', v_booking.id,
    'status', 'completed'
  );
end;
$$;

grant execute on function public.confirm_booking_handover(
  uuid, text, integer, text, text, text, jsonb
) to authenticated;

grant execute on function public.confirm_booking_return(
  uuid, integer, text, text
) to authenticated;

insert into storage.buckets (id, name, public)
values ('booking-proofs', 'booking-proofs', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'booking_proofs_insert_authenticated'
  ) then
    create policy booking_proofs_insert_authenticated
    on storage.objects
    for insert
    to authenticated
    with check (bucket_id = 'booking-proofs');
  end if;
end $$;
