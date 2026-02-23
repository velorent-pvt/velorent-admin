create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),

  booking_id uuid not null
    references public.bookings(id) on delete cascade,

  raised_by uuid not null
    references public.profiles(id) on delete cascade,

  dispute_type text not null,
  description text not null,
  image_url text,

  status text not null default 'open',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint disputes_type_check
    check (dispute_type in ('damage','late_return','fuel_shortage','accident','other')),

  constraint disputes_description_check
    check (char_length(trim(description)) >= 10),

  constraint disputes_status_check
    check (status in ('open','in_review','resolved','rejected'))
);

create index if not exists idx_disputes_booking_id on public.disputes(booking_id);
create index if not exists idx_disputes_raised_by on public.disputes(raised_by);
create index if not exists idx_disputes_status on public.disputes(status);
create index if not exists idx_disputes_created_at on public.disputes(created_at desc);
