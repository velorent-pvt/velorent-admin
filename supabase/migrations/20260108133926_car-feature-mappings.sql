drop table if exists car_feature_mappings;

create table car_feature_mappings (
  id uuid primary key default gen_random_uuid(),

  car_id uuid not null
    references cars(id) on delete cascade,

  feature_id int not null
    references car_features(id) on delete cascade,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique (car_id, feature_id)
);



CREATE INDEX idx_car_feature_mappings_car_id ON car_feature_mappings(car_id);
CREATE INDEX idx_car_feature_mappings_feature_id ON car_feature_mappings(feature_id);