drop table if exists car_images;

create table car_images (
  id uuid primary key default gen_random_uuid(),

  car_id uuid not null
    references cars(id) on delete cascade,

  image_url text not null,

  is_primary boolean default false,
  sort_order int default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);



CREATE INDEX idx_car_images_car_id ON car_images(car_id);
CREATE INDEX idx_car_images_is_primary ON car_images(is_primary);
CREATE INDEX idx_car_images_sort_order ON car_images(sort_order);

CREATE UNIQUE INDEX idx_one_primary_per_car 
ON car_images(car_id) 
WHERE is_primary = true;