create or replace function public.get_customer_funnel_stage_customer_vehicles(
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
  vehicles jsonb
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
    coalesce(vehicle_details.vehicles, '[]'::jsonb)
  from qualified
  join public.profiles profiles on profiles.id = qualified.customer_id
  left join public.customers customers on customers.id = profiles.id
  -- Aggregate stage-specific associations to preserve one row per customer.
  left join lateral (
    select jsonb_agg(
      jsonb_build_object('id', vehicle.id, 'name', vehicle.name,
        'registration_number', vehicle.registration_number)
      order by vehicle.name, vehicle.registration_number, vehicle.id
    ) as vehicles
    from (
      select distinct cars.id,
        nullif(trim(concat_ws(' ', brands.name, models.name)), '') as name,
        cars.registration_number
      from public.analytics_events events
      join stages selected on selected.stage_index = p_stage_index
        and selected.event_name = events.event_name
      left join public.bookings booking on booking.id = events.booking_id
        and booking.customer_id = events.customer_id
      join public.cars cars on cars.id = coalesce(events.vehicle_id, booking.car_id)
      left join public.car_brands brands on brands.id = cars.brand_id
      left join public.car_models models on models.id = cars.model_id
      where events.customer_id = qualified.customer_id
        and events.occurred_at >= qualified.reached_at
        and events.occurred_at < p_end_at
    ) vehicle
  ) vehicle_details on true
  order by profiles.created_at desc;
end;
$$;

revoke all on function public.get_customer_funnel_stage_customer_vehicles(
  timestamptz, timestamptz, integer
) from public, anon;
grant execute on function public.get_customer_funnel_stage_customer_vehicles(
  timestamptz, timestamptz, integer
) to authenticated;
