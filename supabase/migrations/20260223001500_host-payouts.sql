create table if not exists public.host_payouts (
  id uuid primary key default gen_random_uuid(),

  booking_id uuid not null unique
    references public.bookings(id) on delete cascade,

  host_id uuid not null
    references public.hosts(id) on delete cascade,

  gross_booking_amount numeric(10,2) not null check (gross_booking_amount >= 0),
  security_deposit_amount numeric(10,2) not null default 0 check (security_deposit_amount >= 0),
  commission_amount numeric(10,2) not null default 0 check (commission_amount >= 0),

  -- hostEarnings = (total_amount - deposit_amount) - commission_amount
  host_earnings_amount numeric(10,2)
    generated always as (
      (gross_booking_amount - security_deposit_amount) - commission_amount
    ) stored,

  currency text not null default 'INR',

  status text not null default 'pending'
    check (status in ('pending','queued','processing','paid','failed','cancelled')),

  payout_due_at timestamptz,
  payout_initiated_at timestamptz,
  payout_completed_at timestamptz,
  payout_failed_at timestamptz,

  cashfree_payout_reference_id text,
  cashfree_payout_id text,
  failure_reason text,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint host_payouts_non_negative_earnings
    check (host_earnings_amount >= 0)
);

create index if not exists idx_host_payouts_host_id
  on public.host_payouts(host_id);

create index if not exists idx_host_payouts_status
  on public.host_payouts(status);

create index if not exists idx_host_payouts_due_at
  on public.host_payouts(payout_due_at);

create index if not exists idx_host_payouts_created_at
  on public.host_payouts(created_at desc);

create unique index if not exists idx_host_payouts_cashfree_ref
  on public.host_payouts(cashfree_payout_reference_id)
  where cashfree_payout_reference_id is not null;

create or replace function public.sync_host_payout_from_booking()
returns trigger
language plpgsql
as $$
begin
  insert into public.host_payouts (
    booking_id,
    host_id,
    gross_booking_amount,
    security_deposit_amount,
    commission_amount,
    payout_due_at,
    status,
    updated_at
  )
  values (
    new.id,
    new.host_id,
    coalesce(new.total_amount, 0),
    coalesce(new.deposit_amount, 0),
    coalesce(new.commission_amount, 0),
    new.end_time,
    case
      when new.status in ('cancelled', 'rejected') then 'cancelled'
      else 'pending'
    end,
    now()
  )
  on conflict (booking_id) do update
  set
    host_id = excluded.host_id,
    gross_booking_amount = excluded.gross_booking_amount,
    security_deposit_amount = excluded.security_deposit_amount,
    commission_amount = excluded.commission_amount,
    payout_due_at = excluded.payout_due_at,
    status = case
      when new.status in ('cancelled', 'rejected') then 'cancelled'
      when public.host_payouts.status = 'cancelled'
           and new.status not in ('cancelled', 'rejected')
        then 'pending'
      else public.host_payouts.status
    end,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists trg_sync_host_payout_from_booking on public.bookings;
create trigger trg_sync_host_payout_from_booking
after insert or update of host_id, total_amount, deposit_amount, commission_amount, end_time, status
on public.bookings
for each row
execute function public.sync_host_payout_from_booking();

create or replace function public.set_host_payouts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_host_payouts_updated_at on public.host_payouts;
create trigger trg_set_host_payouts_updated_at
before update on public.host_payouts
for each row
execute function public.set_host_payouts_updated_at();

insert into public.host_payouts (
  booking_id,
  host_id,
  gross_booking_amount,
  security_deposit_amount,
  commission_amount,
  payout_due_at,
  status
)
select
  b.id,
  b.host_id,
  coalesce(b.total_amount, 0),
  coalesce(b.deposit_amount, 0),
  coalesce(b.commission_amount, 0),
  b.end_time,
  case
    when b.status in ('cancelled', 'rejected') then 'cancelled'
    else 'pending'
  end
from public.bookings b
on conflict (booking_id) do update
set
  host_id = excluded.host_id,
  gross_booking_amount = excluded.gross_booking_amount,
  security_deposit_amount = excluded.security_deposit_amount,
  commission_amount = excluded.commission_amount,
  payout_due_at = excluded.payout_due_at,
  status = case
    when excluded.status = 'cancelled' then 'cancelled'
    when public.host_payouts.status = 'cancelled' and excluded.status = 'pending'
      then 'pending'
    else public.host_payouts.status
  end,
  updated_at = now();
