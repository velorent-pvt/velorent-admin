DROP INDEX IF EXISTS idx_one_review_per_customer_per_car;

ALTER TABLE car_reviews
DROP CONSTRAINT IF EXISTS car_reviews_customer_id_fkey;

ALTER TABLE car_reviews
DROP COLUMN customer_id;

ALTER TABLE car_reviews
ADD COLUMN profile_id uuid NOT NULL;

ALTER TABLE car_reviews
ADD CONSTRAINT car_reviews_profile_id_fkey
FOREIGN KEY (profile_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

CREATE INDEX idx_car_reviews_profile_id
ON car_reviews(profile_id);


CREATE UNIQUE INDEX idx_one_review_per_profile_per_car
ON car_reviews(car_id, profile_id);
