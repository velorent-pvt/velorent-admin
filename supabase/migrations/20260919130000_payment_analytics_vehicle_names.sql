drop function if exists public.get_payment_analytics_customers(
  timestamptz, timestamptz, text
);

create function public.get_payment_analytics_customers(
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_metric_key text
)
returns table (
  id uuid,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  role_id integer,
  created_at timestamptz,
  aadhaar_name text,
  aadhaar_number text,
  dl_name text,
  dl_number text,
  vehicle_names text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role_id = 1
  ) then
    raise exception 'admin_access_required' using errcode = '42501';
  end if;

  if p_start_at is null or p_end_at is null or p_end_at <= p_start_at then
    raise exception 'invalid_date_range' using errcode = '22023';
  end if;

  if p_end_at - p_start_at > interval '366 days' then
    raise exception 'date_range_too_large' using errcode = '22023';
  end if;

  if p_metric_key not in (
    'total_attempts', 'successful', 'failed', 'pending', 'cancelled', 'success_rate'
  ) then
    raise exception 'invalid_metric_key' using errcode = '22023';
  end if;

  return query
  with attempts as (
    select distinct on (events.payment_attempt_id)
      events.payment_attempt_id,
      events.customer_id,
      events.vehicle_id,
      events.occurred_at as started_at
    from public.analytics_events events
    where events.event_name = 'payment_started'
      and events.payment_attempt_id is not null
      and events.occurred_at >= p_start_at
      and events.occurred_at < p_end_at
    order by events.payment_attempt_id, events.occurred_at
  ),
  classified as (
    select
      attempts.customer_id,
      attempts.vehicle_id,
      latest.event_name as final_status
    from attempts
    left join lateral (
      select events.event_name
      from public.analytics_events events
      where events.payment_attempt_id = attempts.payment_attempt_id
        and events.event_name in (
          'payment_successful', 'payment_failed',
          'payment_pending', 'payment_cancelled'
        )
        and events.occurred_at >= attempts.started_at
        and events.occurred_at < p_end_at
      order by events.occurred_at desc, events.received_at desc
      limit 1
    ) latest on true
  ),
  qualified as (
    select classified.customer_id, classified.vehicle_id
    from classified
    where p_metric_key = 'total_attempts'
      or (p_metric_key in ('successful', 'success_rate') and classified.final_status = 'payment_successful')
      or (p_metric_key = 'failed' and classified.final_status = 'payment_failed')
      or (p_metric_key = 'pending' and classified.final_status = 'payment_pending')
      or (p_metric_key = 'cancelled' and classified.final_status = 'payment_cancelled')
  )
  select
    profiles.id,
    profiles.full_name,
    profiles.email,
    profiles.phone,
    profiles.avatar_url,
    profiles.role_id::integer,
    profiles.created_at,
    customers.aadhaar_name,
    customers.aadhaar_number,
    customers.dl_name,
    customers.dl_number,
    string_agg(
      distinct nullif(trim(concat_ws(' ', car_brands.name, car_models.name)), ''),
      ', '
    ) as vehicle_names
  from qualified
  join public.profiles profiles on profiles.id = qualified.customer_id
  left join public.customers customers on customers.id = profiles.id
  left join public.cars cars on cars.id = qualified.vehicle_id
  left join public.car_brands car_brands on car_brands.id = cars.brand_id
  left join public.car_models car_models on car_models.id = cars.model_id
  group by
    profiles.id,
    profiles.full_name,
    profiles.email,
    profiles.phone,
    profiles.avatar_url,
    profiles.role_id,
    profiles.created_at,
    customers.aadhaar_name,
    customers.aadhaar_number,
    customers.dl_name,
    customers.dl_number
  order by profiles.created_at desc;
end;
$$;

revoke all on function public.get_payment_analytics_customers(
  timestamptz, timestamptz, text
) from public, anon;
grant execute on function public.get_payment_analytics_customers(
  timestamptz, timestamptz, text
) to authenticated;
