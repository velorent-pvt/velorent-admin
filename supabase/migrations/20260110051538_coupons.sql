drop table if exists coupons;

create table coupons (
  id uuid primary key default gen_random_uuid(),

  code text unique not null,

  discount_type text not null
    check (discount_type in ('percentage', 'flat')),

  discount_value numeric not null
    check (discount_value > 0),

  min_booking_amount numeric default 0,

  start_date timestamptz not null,
  end_date timestamptz not null,

  per_customer_limit int default 1,

  is_active boolean default true,

  created_at timestamptz default now()
);



CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_is_active ON coupons(is_active);
CREATE INDEX idx_coupons_start_date ON coupons(start_date);
CREATE INDEX idx_coupons_end_date ON coupons(end_date);
CREATE INDEX idx_coupons_active_valid ON coupons(is_active, start_date, end_date)
  WHERE is_active = true;