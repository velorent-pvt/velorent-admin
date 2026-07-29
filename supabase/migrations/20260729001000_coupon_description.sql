alter table coupons
  drop column if exists color,
  add column if not exists description text;
