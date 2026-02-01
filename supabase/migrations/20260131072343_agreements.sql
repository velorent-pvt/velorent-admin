drop table if exists agreements;

create table agreements (
  id uuid primary key default gen_random_uuid(),

  vehicle_number text not null,
  pdf_link text,

  created_at timestamptz default now()
);
