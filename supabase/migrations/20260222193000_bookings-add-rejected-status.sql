alter table public.bookings
  drop constraint if exists booking_status_check;

alter table public.bookings
  add constraint booking_status_check
  check (
    status in ('pending','confirmed','cancelled','rejected','ongoing','completed')
  );
