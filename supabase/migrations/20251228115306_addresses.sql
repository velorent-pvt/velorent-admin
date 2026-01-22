drop table if exists addresses;


create table addresses (
  id uuid primary key default gen_random_uuid(),

  profile_id uuid not null
    references profiles(id) on delete cascade,

  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null,
  pincode text not null,
  country text default 'India',
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
