drop table if exists car_pickup_addresses;

create table car_pickup_addresses (
  id uuid primary key default gen_random_uuid(),

  car_id uuid not null unique
    references cars(id) on delete cascade,

  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null,
  pincode text not null,

  latitude numeric(9,6),
  longitude numeric(9,6),

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);


CREATE INDEX idx_car_pickup_addresses_car_id ON car_pickup_addresses(car_id);
CREATE INDEX idx_car_pickup_addresses_city ON car_pickup_addresses(city);
CREATE INDEX idx_car_pickup_addresses_pincode ON car_pickup_addresses(pincode);

