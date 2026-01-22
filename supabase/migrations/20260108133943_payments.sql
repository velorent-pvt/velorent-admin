drop table if exists payments;

create table payments (
  id uuid primary key default gen_random_uuid(),

  booking_id uuid not null
    references bookings(id) on delete cascade,

  customer_id uuid not null
    references customers(id) on delete cascade,

  amount numeric(10,2) not null,
  currency text not null default 'INR',

  payment_gateway text,
  payment_method text,

  gateway_payment_id text,
  gateway_order_id text,

  status text not null default 'initiated',

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint payment_status_check
    check (status in ('initiated','successful','failed','refunded'))
);


CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_gateway_payment_id ON payments(gateway_payment_id);
CREATE INDEX idx_payments_gateway_order_id ON payments(gateway_order_id);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);

CREATE UNIQUE INDEX idx_one_successful_payment_per_booking 
ON payments(booking_id) 
WHERE status = 'successful';