DROP INDEX IF EXISTS idx_bookings_customer_id;

ALTER TABLE bookings
DROP CONSTRAINT IF EXISTS bookings_customer_id_fkey;

ALTER TABLE bookings
DROP COLUMN IF EXISTS customer_id;

ALTER TABLE bookings
ADD COLUMN customer_id uuid NOT NULL;

ALTER TABLE bookings
ADD CONSTRAINT bookings_customer_id_fkey
FOREIGN KEY (customer_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_bookings_customer_id
ON bookings(customer_id);
