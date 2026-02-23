create table if not exists public.booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint booking_events_type_check check (
    event_type in (
      'created',
      'handover_confirmed',
      'trip_started',
      'trip_ended',
      'returned',
      'cancelled_by_customer',
      'rejected_by_host'
    )
  )
);

create index if not exists idx_booking_events_booking_id
  on public.booking_events(booking_id);

create index if not exists idx_booking_events_created_at
  on public.booking_events(created_at desc);

create index if not exists idx_booking_events_event_type
  on public.booking_events(event_type);

create or replace function public.handle_booking_event_on_insert()
returns trigger
language plpgsql
as $$
begin
  insert into public.booking_events (booking_id, event_type, created_at)
  values (new.id, 'created', coalesce(new.created_at, now()));
  return new;
end;
$$;

create or replace function public.handle_booking_event_on_status_update()
returns trigger
language plpgsql
as $$
declare
  event_time timestamptz := coalesce(new.updated_at, now());
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  if new.status = 'ongoing' then
    insert into public.booking_events (booking_id, event_type, created_at)
    values
      (new.id, 'handover_confirmed', event_time),
      (new.id, 'trip_started', event_time);
  elsif new.status = 'completed' then
    insert into public.booking_events (booking_id, event_type, created_at)
    values
      (new.id, 'trip_ended', event_time),
      (new.id, 'returned', event_time);
  elsif new.status = 'cancelled' then
    insert into public.booking_events (booking_id, event_type, created_at)
    values (new.id, 'cancelled_by_customer', event_time);
  elsif new.status = 'rejected' then
    insert into public.booking_events (booking_id, event_type, created_at)
    values (new.id, 'rejected_by_host', event_time);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_booking_event_on_insert on public.bookings;
create trigger trg_booking_event_on_insert
after insert on public.bookings
for each row
execute function public.handle_booking_event_on_insert();

drop trigger if exists trg_booking_event_on_status_update on public.bookings;
create trigger trg_booking_event_on_status_update
after update of status on public.bookings
for each row
execute function public.handle_booking_event_on_status_update();

insert into public.booking_events (booking_id, event_type, created_at)
select b.id, 'created', coalesce(b.created_at, now())
from public.bookings b
where not exists (
  select 1
  from public.booking_events e
  where e.booking_id = b.id
    and e.event_type = 'created'
);

insert into public.booking_events (booking_id, event_type, created_at)
select b.id, 'handover_confirmed', coalesce(b.updated_at, now())
from public.bookings b
where b.status in ('ongoing', 'completed')
  and not exists (
    select 1
    from public.booking_events e
    where e.booking_id = b.id
      and e.event_type = 'handover_confirmed'
  );

insert into public.booking_events (booking_id, event_type, created_at)
select b.id, 'trip_started', coalesce(b.updated_at, now())
from public.bookings b
where b.status in ('ongoing', 'completed')
  and not exists (
    select 1
    from public.booking_events e
    where e.booking_id = b.id
      and e.event_type = 'trip_started'
  );

insert into public.booking_events (booking_id, event_type, created_at)
select b.id, 'trip_ended', coalesce(b.updated_at, now())
from public.bookings b
where b.status = 'completed'
  and not exists (
    select 1
    from public.booking_events e
    where e.booking_id = b.id
      and e.event_type = 'trip_ended'
  );

insert into public.booking_events (booking_id, event_type, created_at)
select b.id, 'returned', coalesce(b.updated_at, now())
from public.bookings b
where b.status = 'completed'
  and not exists (
    select 1
    from public.booking_events e
    where e.booking_id = b.id
      and e.event_type = 'returned'
  );

insert into public.booking_events (booking_id, event_type, created_at)
select b.id, 'cancelled_by_customer', coalesce(b.updated_at, now())
from public.bookings b
where b.status = 'cancelled'
  and not exists (
    select 1
    from public.booking_events e
    where e.booking_id = b.id
      and e.event_type = 'cancelled_by_customer'
  );

insert into public.booking_events (booking_id, event_type, created_at)
select b.id, 'rejected_by_host', coalesce(b.updated_at, now())
from public.bookings b
where b.status = 'rejected'
  and not exists (
    select 1
    from public.booking_events e
    where e.booking_id = b.id
      and e.event_type = 'rejected_by_host'
  );
