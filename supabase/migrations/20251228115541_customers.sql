drop table if exists customers;


create table customers (
  id uuid primary key
    references profiles(id) on delete cascade,

  verification_status text default 'pending',

  verified_at timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

