-- Add extracted image color fields to coupons table
-- bg_color: light tinted background color for offer cards
-- accent_color: dominant saturated color for text and accents

alter table coupons
  add column if not exists bg_color text,
  add column if not exists accent_color text;
