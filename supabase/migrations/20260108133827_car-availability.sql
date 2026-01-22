drop table if exists car_availability;

create table car_availability (
  id uuid primary key default gen_random_uuid(),

  car_id uuid not null
    references cars(id) on delete cascade,

  start_time timestamptz not null,
  end_time timestamptz not null,

  status text not null default 'blocked',
  reason text,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint availability_status_check
    check (status in ('blocked')),

  constraint availability_time_check
    check (end_time > start_time)
);


CREATE INDEX idx_car_availability_car_id ON car_availability(car_id);
CREATE INDEX idx_car_availability_start_time ON car_availability(start_time);
CREATE INDEX idx_car_availability_end_time ON car_availability(end_time);
CREATE INDEX idx_car_availability_status ON car_availability(status);

CREATE INDEX idx_car_availability_time_range 
ON car_availability USING GIST (
  tstzrange(start_time, end_time)
);