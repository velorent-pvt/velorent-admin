alter table coupons
  add column if not exists title text;

update coupons
set title = code
where title is null or btrim(title) = '';

alter table coupons
  alter column title set not null;

alter table coupons
  add column if not exists image_url text;
