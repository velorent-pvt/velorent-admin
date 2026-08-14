create or replace function public.enqueue_push_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_link text default null,
  p_deeplink text default null,
  p_campaign_id uuid default null,
  p_scheduled_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_id uuid;
begin
  if p_user_id is null then
    return null;
  end if;

  -- Only enqueue if the user has a valid expo push token
  if not exists (select 1 from public.profiles where id = p_user_id and expo_push_token is not null) then
    return null;
  end if;

  insert into public.notifications (user_id, type, title, message, link, deeplink)
  values (p_user_id, 'push', p_title, p_message, p_link, p_deeplink);

  insert into public.push_notification_jobs (
    campaign_id,
    user_id,
    title,
    message,
    link,
    deeplink,
    scheduled_at
  )
  values (
    p_campaign_id,
    p_user_id,
    p_title,
    p_message,
    p_link,
    p_deeplink,
    p_scheduled_at
  )
  on conflict (campaign_id, user_id) do update
    set title = excluded.title,
        message = excluded.message,
        link = excluded.link,
        deeplink = excluded.deeplink,
        scheduled_at = excluded.scheduled_at,
        status = 'queued',
        last_error = null
  returning id into v_job_id;

  return v_job_id;
end;
$$;
