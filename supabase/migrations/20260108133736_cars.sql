DROP TABLE IF EXISTS cars;

CREATE TABLE cars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  host_id uuid NOT NULL
    REFERENCES profiles(id) ON DELETE CASCADE,

  brand_id uuid NOT NULL
    REFERENCES car_brands(id),

  model_id uuid NOT NULL
    REFERENCES car_models(id),

  registration_number text NOT NULL UNIQUE,
  manufacturing_year int,

  fuel_type text NOT NULL,
  vehicle_seat_capacity int NOT NULL,

  owner text NOT NULL,
  body_type text NOT NULL,

  rc_valid_till date NOT NULL,
  insurance_valid_till date NOT NULL,

  hourly_price numeric(10,2) NOT NULL DEFAULT 0,
  deposit_amount numeric(10,2) NOT NULL DEFAULT 0,

  commission_percentage numeric(5,2) NOT NULL DEFAULT 0,
  delivery_rate numeric(10,2) NOT NULL DEFAULT 0,

  is_active boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  delivery_enabled boolean NOT NULL DEFAULT false,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT fuel_check
    CHECK (fuel_type IN ('petrol','diesel','cng','electric')),

  CONSTRAINT valid_manufacturing_year
    CHECK (
      manufacturing_year BETWEEN 1990
      AND extract(year FROM now())::int + 1
    )
);
