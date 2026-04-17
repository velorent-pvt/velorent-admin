-- Migration to fix host_id foreign key constraints in bookings and cars tables
-- The host_id should reference profiles(id) to allow users to list and book cars 
-- even if they haven't completed full host onboarding (bank details, etc.)

BEGIN;

-- Fix bookings table host_id constraint
ALTER TABLE bookings
DROP CONSTRAINT IF EXISTS bookings_host_id_fkey;

ALTER TABLE bookings
ADD CONSTRAINT bookings_host_id_fkey
FOREIGN KEY (host_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- Fix cars table host_id constraint (ensuring consistency)
ALTER TABLE cars
DROP CONSTRAINT IF EXISTS cars_host_id_fkey;

ALTER TABLE cars
ADD CONSTRAINT cars_host_id_fkey
FOREIGN KEY (host_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

COMMIT;
