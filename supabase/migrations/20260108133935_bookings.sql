drop table if exists bookings;

create table bookings (
  id uuid primary key default gen_random_uuid(),

  car_id uuid not null
    references cars(id) on delete cascade,

  customer_id uuid not null
    references customers(id) on delete cascade,

  host_id uuid not null
    references hosts(id) on delete cascade,

  start_time timestamptz not null,
  end_time timestamptz not null,

  total_hours int not null,

  base_amount numeric(10,2) not null,
  delivery_amount numeric(10,2) not null default 0,

  commission_percentage numeric(5,2) not null,
  commission_amount numeric(10,2) not null,

  deposit_amount numeric(10,2) not null default 0,
  deposit_status text not null default 'pending',

  total_amount numeric(10,2) not null,

  pickup_type text not null default 'self_pickup',

  status text not null default 'pending',

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint booking_time_check
    check (end_time > start_time),

  constraint booking_status_check
    check (
      status in ('pending','confirmed','cancelled','ongoing','completed')
    ),

  constraint pickup_type_check
    check (pickup_type in ('self_pickup','home_delivery')),

  constraint deposit_status_check
    check (
      deposit_status in ('pending','paid','refunded','forfeited')
    )

);



CREATE INDEX idx_bookings_car_id ON bookings(car_id);
CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_host_id ON bookings(host_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_start_time ON bookings(start_time);
CREATE INDEX idx_bookings_end_time ON bookings(end_time);
CREATE INDEX idx_bookings_created_at ON bookings(created_at DESC);

CREATE INDEX idx_bookings_time_range ON bookings USING GIST (
  tstzrange(start_time, end_time)
);