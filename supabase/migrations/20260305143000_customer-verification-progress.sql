alter table public.customers
  add column if not exists aadhaar_number text,
  add column if not exists aadhaar_name text,
  add column if not exists dl_number text,
  add column if not exists dl_name text;
