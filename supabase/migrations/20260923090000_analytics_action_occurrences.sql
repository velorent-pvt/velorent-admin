-- Occurrence-level drilldowns; summary reports continue counting unique customers.
create or replace function public.get_customer_funnel_stage_actions(
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_stage_index integer
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
  vehicles jsonb,
  action_id uuid,
  action_at timestamptz
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

  if p_stage_index is null or p_stage_index not between 1 and 10 then
    raise exception 'invalid_stage_index' using errcode = '22023';
  end if;

  return query
  with recursive
  stages(stage_index, event_name, parent_stage_index) as (
    values
      (1, 'app_opened'::public.analytics_event_name, 0),
      (2, 'vehicle_searched'::public.analytics_event_name, 1),
      (3, 'search_results_viewed'::public.analytics_event_name, 1),
      (4, 'vehicle_details_viewed'::public.analytics_event_name, 1),
      (5, 'booking_started'::public.analytics_event_name, 4),
      (6, 'kyc_started'::public.analytics_event_name, 5),
      (7, 'kyc_completed'::public.analytics_event_name, 5),
      (8, 'payment_started'::public.analytics_event_name, 5),
      (9, 'payment_successful'::public.analytics_event_name, 8),
      (10, 'booking_confirmed'::public.analytics_event_name, 9)
  ),
  progression as (
    select
      1 as stage_index,
      events.customer_id,
      min(events.occurred_at) as reached_at
    from public.analytics_events events
    where events.event_name = 'app_opened'
      and events.occurred_at >= p_start_at
      and events.occurred_at < p_end_at
    group by events.customer_id

    union all

    select
      target.stage_index,
      prior.customer_id,
      next_stage.reached_at
    from progression prior
    join stages target on target.parent_stage_index = prior.stage_index
    cross join lateral (
      select min(events.occurred_at) as reached_at
      from public.analytics_events events
      where events.customer_id = prior.customer_id
        and events.event_name = target.event_name
        and events.occurred_at >= prior.reached_at
        and events.occurred_at < p_end_at
    ) next_stage
    where next_stage.reached_at is not null
  ),
  qualified as (
    select progression.customer_id, progression.reached_at
    from progression
    where progression.stage_index = p_stage_index
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
    case when cars.id is null then '[]'::jsonb else jsonb_build_array(
      jsonb_build_object('id', cars.id,
        'name', nullif(trim(concat_ws(' ', brands.name, models.name)), ''),
        'registration_number', cars.registration_number)
    ) end,
    events.id,
    events.occurred_at
  from qualified
  join stages selected on selected.stage_index = p_stage_index
  -- Keep the same funnel qualification, but return every subsequent occurrence.
  join public.analytics_events events on events.customer_id = qualified.customer_id
    and events.event_name = selected.event_name
    and events.occurred_at >= qualified.reached_at
    and events.occurred_at < p_end_at
  join public.profiles profiles on profiles.id = events.customer_id
  left join public.customers customers on customers.id = profiles.id
  left join public.bookings booking on booking.id = events.booking_id
    and booking.customer_id = events.customer_id
  left join public.cars cars on cars.id = coalesce(events.vehicle_id, booking.car_id)
  left join public.car_brands brands on brands.id = cars.brand_id
  left join public.car_models models on models.id = cars.model_id
  order by events.occurred_at desc, events.id desc;
end;
$$;

revoke all on function public.get_customer_funnel_stage_actions(
  timestamptz, timestamptz, integer
) from public, anon;
grant execute on function public.get_customer_funnel_stage_actions(
  timestamptz, timestamptz, integer
) to authenticated;

create or replace function public.get_payment_analytics_actions(
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
  vehicles jsonb,
  action_id uuid,
  action_at timestamptz
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

  if p_metric_key is null or p_metric_key not in (
    'total_attempts', 'successful', 'failed', 'pending', 'cancelled', 'success_rate'
  ) then
    raise exception 'invalid_metric_key' using errcode = '22023';
  end if;

  return query
  with attempts as (
    select distinct on (events.payment_attempt_id)
      events.payment_attempt_id,
      events.customer_id,
      coalesce(events.vehicle_id, booking.car_id) as vehicle_id,
      events.occurred_at as started_at
    from public.analytics_events events
    left join public.bookings booking on booking.id = events.booking_id and booking.customer_id = events.customer_id
    where events.event_name = 'payment_started'
      and events.payment_attempt_id is not null
      and events.occurred_at >= p_start_at
      and events.occurred_at < p_end_at
    order by events.payment_attempt_id, events.occurred_at, events.id
  ),
  classified as (
    select
      attempts.payment_attempt_id,
      attempts.customer_id,
      attempts.vehicle_id,
      latest.event_name as final_status,
      attempts.started_at,
      latest.occurred_at as status_at
    from attempts
    left join lateral (
      select events.event_name, events.occurred_at
      from public.analytics_events events
      where events.payment_attempt_id = attempts.payment_attempt_id
        and events.event_name in (
          'payment_successful', 'payment_failed',
          'payment_pending', 'payment_cancelled'
        )
        and events.occurred_at >= attempts.started_at
        and events.occurred_at < p_end_at
      order by events.occurred_at desc, events.received_at desc, events.id desc
      limit 1
    ) latest on true
  ),
  qualified as (
    select classified.payment_attempt_id, classified.customer_id, classified.vehicle_id,
      case when p_metric_key = 'total_attempts' then classified.started_at
        else coalesce(classified.status_at, classified.started_at) end as action_at
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
    case when cars.id is null then '[]'::jsonb else jsonb_build_array(
      jsonb_build_object('id', cars.id,
        'name', nullif(trim(concat_ws(' ', car_brands.name, car_models.name)), ''),
        'registration_number', cars.registration_number)
    ) end as vehicles,
    qualified.payment_attempt_id,
    qualified.action_at
  from qualified
  join public.profiles profiles on profiles.id = qualified.customer_id
  left join public.customers customers on customers.id = profiles.id
  left join public.cars cars on cars.id = qualified.vehicle_id
  left join public.car_brands car_brands on car_brands.id = cars.brand_id
  left join public.car_models car_models on car_models.id = cars.model_id
  order by qualified.action_at desc, qualified.payment_attempt_id desc;
end;
$$;

revoke all on function public.get_payment_analytics_actions(
  timestamptz, timestamptz, text
) from public, anon;
grant execute on function public.get_payment_analytics_actions(
  timestamptz, timestamptz, text
) to authenticated;
