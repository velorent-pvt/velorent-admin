-- Manual document verification requests submitted by customers
-- Customers upload front + back photos; admin reviews and enters the details.
-- References profiles (not customers) because a profiles row always exists
-- for authenticated users, whereas a customers row may not yet exist.

create table if not exists manual_verifications (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references profiles(id) on delete cascade,
  document_type   text not null check (document_type in ('aadhaar', 'dl')),
  front_image_url text not null,
  back_image_url  text not null,
  status          text not null default 'pending'
                    check (status in ('pending', 'approved', 'rejected')),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists idx_manual_verifications_profile
  on manual_verifications(profile_id);

create index if not exists idx_manual_verifications_status
  on manual_verifications(status);

-- Storage bucket for verification document photos
-- Create the bucket via Supabase dashboard or run:
-- insert into storage.buckets (id, name, public) values ('verification_docs', 'verification_docs', false)
-- on conflict do nothing;
