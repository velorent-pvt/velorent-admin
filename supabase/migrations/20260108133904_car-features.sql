drop table if exists car_features;

create table car_features (
  id int primary key generated always as identity not null,
  name text not null unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE INDEX idx_car_features_name ON car_features(name);