alter table public.customers
  add column if not exists aadhaar_address text,
  add column if not exists dl_address text;
