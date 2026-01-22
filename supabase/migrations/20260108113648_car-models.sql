drop table if exists car_models;

create table car_models (
  id uuid primary key default gen_random_uuid(),

  brand_id uuid not null
    references public.car_brands(id)
    on delete cascade,

  name text not null,
  image_url text,

  min_earn_amount numeric(10,2) not null,
  max_earn_amount numeric(10,2) not null,


  created_at timestamptz default now(),
  updated_at timestamptz default now(),


  check (min_earn_amount >= 0),
  check (max_earn_amount >= min_earn_amount)
);
