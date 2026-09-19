create or replace function public.get_payment_analytics(
  p_start_at timestamptz,
  p_end_at timestamptz
)
returns table (
  metric_key text,
  current_value numeric,
  previous_value numeric
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

  return query
  with periods as (
    select 'current'::text as period_name, p_start_at as start_at, p_end_at as end_at
    union all
    select 'previous', p_start_at - (p_end_at - p_start_at), p_start_at
  ),
  attempts as (
    select distinct on (periods.period_name, events.payment_attempt_id)
      periods.period_name,
      periods.end_at,
      events.payment_attempt_id,
      events.customer_id,
      events.occurred_at as started_at
    from periods
    join public.analytics_events events
      on events.event_name = 'payment_started'
      and events.occurred_at >= periods.start_at
      and events.occurred_at < periods.end_at
    where events.payment_attempt_id is not null
    order by periods.period_name, events.payment_attempt_id, events.occurred_at
  ),
  classified as (
    select
      attempts.period_name,
      attempts.payment_attempt_id,
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
        and events.occurred_at < attempts.end_at
      order by events.occurred_at desc, events.received_at desc
      limit 1
    ) latest on true
  ),
  counts as (
    select
      periods.period_name,
      count(classified.payment_attempt_id)::numeric as total_attempts,
      count(*) filter (where classified.final_status = 'payment_successful')::numeric as successful,
      count(*) filter (where classified.final_status = 'payment_failed')::numeric as failed,
      count(*) filter (where classified.final_status = 'payment_pending')::numeric as pending,
      count(*) filter (where classified.final_status = 'payment_cancelled')::numeric as cancelled
    from periods
    left join classified on classified.period_name = periods.period_name
    group by periods.period_name
  ),
  metrics(metric_order, metric_key, period_name, metric_value) as (
    select 1, 'total_attempts', period_name, total_attempts from counts
    union all select 2, 'successful', period_name, successful from counts
    union all select 3, 'failed', period_name, failed from counts
    union all select 4, 'pending', period_name, pending from counts
    union all select 5, 'cancelled', period_name, cancelled from counts
    union all select 6, 'success_rate', period_name,
      case when total_attempts > 0 then successful * 100 / total_attempts else 0 end
    from counts
  )
  select
    current.metric_key,
    current.metric_value,
    previous.metric_value
  from metrics current
  join metrics previous
    on previous.metric_key = current.metric_key
    and previous.period_name = 'previous'
  where current.period_name = 'current'
  order by current.metric_order;
end;
$$;

revoke all on function public.get_payment_analytics(timestamptz, timestamptz)
  from public, anon;
grant execute on function public.get_payment_analytics(timestamptz, timestamptz)
  to authenticated;

create or replace function public.get_payment_analytics_customers(
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
  dl_number text
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
    select distinct classified.customer_id
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
    customers.dl_number
  from qualified
  join public.profiles profiles on profiles.id = qualified.customer_id
  left join public.customers customers on customers.id = profiles.id
  order by profiles.created_at desc;
end;
$$;

revoke all on function public.get_payment_analytics_customers(
  timestamptz, timestamptz, text
) from public, anon;
grant execute on function public.get_payment_analytics_customers(
  timestamptz, timestamptz, text
) to authenticated;
