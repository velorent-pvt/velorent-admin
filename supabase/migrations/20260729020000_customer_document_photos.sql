-- Add photo URL columns for manual photo upload verification path
alter table public.customers
  add column if not exists aadhaar_photo_url text,
  add column if not exists dl_photo_url text;
