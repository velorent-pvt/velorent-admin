create or replace function public.get_customer_funnel(
  p_start_at timestamptz,
  p_end_at timestamptz
)
returns table (
  stage_index integer,
  event_name public.analytics_event_name,
  current_customers bigint,
  previous_customers bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1
    from public.profiles
    where id = auth.uid() and role_id = 1
  ) then
    raise exception 'admin_access_required' using errcode = '42501';
  end if;

  if p_start_at is null or p_end_at is null or p_end_at <= p_start_at then
    raise exception 'invalid_date_range' using errcode = '22023';
  end if;

  if p_end_at - p_start_at > interval '366 days' then
    raise exception 'date_range_too_large' using errcode = '22023';
  end if;

  return query
  with recursive
  periods as (
    select 'current'::text as period_name, p_start_at as start_at, p_end_at as end_at
    union all
    select
      'previous'::text,
      p_start_at - (p_end_at - p_start_at),
      p_start_at
  ),
  stages(stage_index, event_name) as (
    values
      (1, 'app_opened'::public.analytics_event_name),
      (2, 'vehicle_searched'::public.analytics_event_name),
      (3, 'search_results_viewed'::public.analytics_event_name),
      (4, 'vehicle_details_viewed'::public.analytics_event_name),
      (5, 'booking_started'::public.analytics_event_name),
      (6, 'kyc_started'::public.analytics_event_name),
      (7, 'kyc_completed'::public.analytics_event_name),
      (8, 'payment_started'::public.analytics_event_name),
      (9, 'payment_successful'::public.analytics_event_name),
      (10, 'booking_confirmed'::public.analytics_event_name)
  ),
  progression as (
    select
      p.period_name,
      p.start_at,
      p.end_at,
      1 as stage_index,
      e.customer_id,
      min(e.occurred_at) as reached_at
    from periods p
    join public.analytics_events e
      on e.event_name = 'app_opened'
      and e.occurred_at >= p.start_at
      and e.occurred_at < p.end_at
    group by p.period_name, p.start_at, p.end_at, e.customer_id

    union all

    select
      prior.period_name,
      prior.start_at,
      prior.end_at,
      prior.stage_index + 1,
      prior.customer_id,
      next_stage.reached_at
    from progression prior
    join stages target on target.stage_index = prior.stage_index + 1
    cross join lateral (
      select min(e.occurred_at) as reached_at
      from public.analytics_events e
      where e.customer_id = prior.customer_id
        and e.event_name = target.event_name
        and e.occurred_at >= prior.reached_at
        and e.occurred_at < prior.end_at
    ) next_stage
    where next_stage.reached_at is not null
  ),
  counts as (
    select
      p.period_name,
      s.stage_index,
      s.event_name,
      count(pr.customer_id)::bigint as customers
    from periods p
    cross join stages s
    left join progression pr
      on pr.period_name = p.period_name
      and pr.stage_index = s.stage_index
    group by p.period_name, s.stage_index, s.event_name
  )
  select
    s.stage_index,
    s.event_name,
    coalesce(c.customers, 0)::bigint,
    coalesce(previous.customers, 0)::bigint
  from stages s
  left join counts c
    on c.stage_index = s.stage_index and c.period_name = 'current'
  left join counts previous
    on previous.stage_index = s.stage_index and previous.period_name = 'previous'
  order by s.stage_index;
end;
$$;

revoke all on function public.get_customer_funnel(timestamptz, timestamptz)
  from public, anon;
grant execute on function public.get_customer_funnel(timestamptz, timestamptz)
  to authenticated;
