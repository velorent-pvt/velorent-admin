drop table if exists roles;

create table roles (
  id smallint primary key generated always as identity not null,
  name text unique not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()

);
