
drop table if exists hosts;

create table hosts (
  id uuid primary key
    references profiles(id) on delete cascade,

  bank_account_holder text,
  bank_account_number text,
  ifsc_code text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);