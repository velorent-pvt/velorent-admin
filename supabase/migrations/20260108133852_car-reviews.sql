drop table if exists car_reviews;

create table car_reviews (
  id uuid primary key default gen_random_uuid(),

  car_id uuid not null
    references cars(id) on delete cascade,

  customer_id uuid not null
    references customers(id) on delete cascade,

  rating int not null,
  review_text text,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint rating_check
    check (rating between 1 and 5)
);



CREATE INDEX idx_car_reviews_car_id ON car_reviews(car_id);
CREATE INDEX idx_car_reviews_customer_id ON car_reviews(customer_id);
CREATE INDEX idx_car_reviews_rating ON car_reviews(rating);
CREATE INDEX idx_car_reviews_created_at ON car_reviews(created_at DESC);

CREATE UNIQUE INDEX idx_one_review_per_customer_per_car 
ON car_reviews(car_id, customer_id);