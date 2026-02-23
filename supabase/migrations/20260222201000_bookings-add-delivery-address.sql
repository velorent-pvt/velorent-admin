alter table public.bookings
  add column if not exists delivery_address text;
