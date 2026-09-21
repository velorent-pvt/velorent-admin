create table if not exists public.booking_settings (
  id boolean primary key default true check (id),
  minimum_booking_hours integer not null default 6 check (minimum_booking_hours in (6, 12, 24)),
  updated_at timestamptz not null default now()
);

insert into public.booking_settings (id, minimum_booking_hours) values (true, 6)
on conflict (id) do nothing;

alter table public.booking_settings enable row level security;

create policy "authenticated users read booking settings" on public.booking_settings for select to authenticated using (true);
create policy "admins update booking settings" on public.booking_settings for update to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role_id = 1))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role_id = 1));

create or replace function public.enforce_minimum_booking_duration()
returns trigger language plpgsql as $$
declare v_minimum_hours integer;
begin
  select minimum_booking_hours into v_minimum_hours from public.booking_settings where id = true;
  v_minimum_hours := coalesce(v_minimum_hours, 6);
  if new.end_time < new.start_time + make_interval(hours => v_minimum_hours) then
    raise exception 'Minimum booking duration is % hours.', v_minimum_hours;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_minimum_booking_duration on public.bookings;
create trigger trg_enforce_minimum_booking_duration before insert on public.bookings
for each row execute function public.enforce_minimum_booking_duration();
