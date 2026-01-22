drop table if exists coupon_usages;

create table coupon_usages (
  id uuid primary key default gen_random_uuid(),

  coupon_id uuid not null
    references coupons(id) on delete cascade,

  customer_id uuid not null
    references customers(id) on delete cascade,

  used_at timestamptz default now(),

  unique (coupon_id, customer_id)
);


CREATE INDEX idx_coupon_usages_coupon_id ON coupon_usages(coupon_id);
CREATE INDEX idx_coupon_usages_customer_id ON coupon_usages(customer_id);
CREATE INDEX idx_coupon_usages_used_at ON coupon_usages(used_at DESC);