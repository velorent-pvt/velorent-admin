alter table public.customers
  drop column if exists verification_status,
  drop column if exists verified_at;
