drop table if exists car_brands;


create table car_brands (
  id uuid primary key default gen_random_uuid(),

  name text not null unique,
  logo_url text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()

);
