create or replace function public.get_search_demand_report(
  p_start_at timestamptz,
  p_end_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
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

  with periods as (
    select 'current'::text as period_name, p_start_at as start_at, p_end_at as end_at
    union all
    select 'previous', p_start_at - (p_end_at - p_start_at), p_start_at
  ),
  searches as (
    select distinct on (periods.period_name, events.search_id)
      periods.period_name,
      events.search_id,
      events.customer_id,
      nullif(lower(trim(events.search_location)), '') as location,
      events.occurred_at,
      result_event.result_count,
      coalesce(result_event.result_count = 0, false) as no_results
    from periods
    join public.analytics_events events
      on events.event_name = 'vehicle_searched'
      and events.occurred_at >= periods.start_at
      and events.occurred_at < periods.end_at
    left join lateral (
      select results.result_count
      from public.analytics_events results
      where results.search_id = events.search_id
        and results.event_name = 'search_results_viewed'
        and results.occurred_at >= events.occurred_at
        and results.occurred_at < periods.end_at
      order by results.occurred_at desc, results.received_at desc
      limit 1
    ) result_event on true
    where events.search_id is not null
    order by periods.period_name, events.search_id, events.occurred_at
  ),
  summary as (
    select
      periods.period_name,
      count(searches.search_id)::bigint as total_searches,
      count(distinct searches.customer_id)::bigint as unique_customers,
      count(distinct searches.location) filter (where searches.location is not null)::bigint as locations_searched,
      count(*) filter (where searches.no_results)::bigint as no_result_searches
    from periods
    left join searches on searches.period_name = periods.period_name
    group by periods.period_name
  ),
  location_stats as (
    select
      searches.period_name,
      searches.location,
      count(*)::bigint as searches,
      count(distinct searches.customer_id)::bigint as unique_customers,
      count(*) filter (where searches.no_results)::bigint as no_result_searches,
      coalesce(avg(searches.result_count) filter (where searches.result_count is not null), 0)::numeric as average_results
    from searches
    where searches.location is not null
    group by searches.period_name, searches.location
  ),
  supply as (
    select lower(trim(addresses.city)) as location, count(*)::bigint as available_vehicles
    from public.car_pickup_addresses addresses
    join public.cars cars on cars.id = addresses.car_id
    where cars.is_active = true and cars.is_verified = true
    group by lower(trim(addresses.city))
  )
  select jsonb_build_object(
    'summary', jsonb_build_object(
      'total_searches', current.total_searches,
      'previous_total_searches', previous.total_searches,
      'unique_customers', current.unique_customers,
      'previous_unique_customers', previous.unique_customers,
      'locations_searched', current.locations_searched,
      'previous_locations_searched', previous.locations_searched,
      'no_result_searches', current.no_result_searches,
      'previous_no_result_searches', previous.no_result_searches,
      'no_result_rate', case when current.total_searches > 0 then current.no_result_searches * 100.0 / current.total_searches else 0 end,
      'previous_no_result_rate', case when previous.total_searches > 0 then previous.no_result_searches * 100.0 / previous.total_searches else 0 end
    ),
    'locations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'location', locations.location,
        'searches', locations.searches,
        'unique_customers', locations.unique_customers,
        'no_result_searches', locations.no_result_searches,
        'no_result_rate', case when locations.searches > 0 then locations.no_result_searches * 100.0 / locations.searches else 0 end,
        'average_results', locations.average_results,
        'previous_searches', coalesce(previous_locations.searches, 0),
        'available_vehicles', coalesce(supply.available_vehicles, 0)
      ) order by locations.searches desc, locations.location)
      from location_stats locations
      left join location_stats previous_locations
        on previous_locations.period_name = 'previous'
        and previous_locations.location = locations.location
      left join supply on supply.location = locations.location
      where locations.period_name = 'current'
    ), '[]'::jsonb)
  ) into v_result
  from summary current
  join summary previous on previous.period_name = 'previous'
  where current.period_name = 'current';

  return v_result;
end;
$$;

revoke all on function public.get_search_demand_report(timestamptz, timestamptz)
  from public, anon;
grant execute on function public.get_search_demand_report(timestamptz, timestamptz)
  to authenticated;

create or replace function public.get_search_location_detail(
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_location text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_location text := nullif(lower(trim(p_location)), '');
  v_result jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role_id = 1
  ) then
    raise exception 'admin_access_required' using errcode = '42501';
  end if;

  if p_start_at is null or p_end_at is null or p_end_at <= p_start_at or v_location is null then
    raise exception 'invalid_search_detail' using errcode = '22023';
  end if;

  with searches as (
    select distinct on (events.search_id)
      events.search_id,
      events.customer_id,
      events.occurred_at,
      result_event.result_count,
      coalesce(result_event.result_count = 0, false) as no_results
    from public.analytics_events events
    left join lateral (
      select results.result_count
      from public.analytics_events results
      where results.search_id = events.search_id
        and results.event_name = 'search_results_viewed'
        and results.occurred_at >= events.occurred_at
        and results.occurred_at < p_end_at
      order by results.occurred_at desc, results.received_at desc
      limit 1
    ) result_event on true
    where events.event_name = 'vehicle_searched'
      and events.search_id is not null
      and lower(trim(events.search_location)) = v_location
      and events.occurred_at >= p_start_at
      and events.occurred_at < p_end_at
    order by events.search_id, events.occurred_at
  ),
  customer_stats as (
    select
      searches.customer_id,
      count(*)::bigint as search_count,
      count(*) filter (where searches.no_results)::bigint as no_result_count,
      max(searches.occurred_at) as last_searched_at
    from searches
    group by searches.customer_id
  )
  select jsonb_build_object(
    'available_vehicles', (
      select count(*)
      from public.car_pickup_addresses addresses
      join public.cars cars on cars.id = addresses.car_id
      where lower(trim(addresses.city)) = v_location
        and cars.is_active = true and cars.is_verified = true
    ),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object(
        'date', daily.day,
        'searches', daily.search_count,
        'no_result_searches', daily.no_result_count
      ) order by daily.day)
      from (
        select occurred_at::date as day, count(*) as search_count,
          count(*) filter (where no_results) as no_result_count
        from searches group by occurred_at::date
      ) daily
    ), '[]'::jsonb),
    'customers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', profiles.id,
        'full_name', profiles.full_name,
        'email', profiles.email,
        'phone', profiles.phone,
        'avatar_url', profiles.avatar_url,
        'role_id', profiles.role_id,
        'created_at', profiles.created_at,
        'aadhaar_name', customers.aadhaar_name,
        'aadhaar_number', customers.aadhaar_number,
        'dl_name', customers.dl_name,
        'dl_number', customers.dl_number,
        'search_count', customer_stats.search_count,
        'no_result_count', customer_stats.no_result_count,
        'last_searched_at', customer_stats.last_searched_at
      ) order by customer_stats.last_searched_at desc)
      from customer_stats
      join public.profiles profiles on profiles.id = customer_stats.customer_id
      left join public.customers customers on customers.id = profiles.id
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_search_location_detail(timestamptz, timestamptz, text)
  from public, anon;
grant execute on function public.get_search_location_detail(timestamptz, timestamptz, text)
  to authenticated;
