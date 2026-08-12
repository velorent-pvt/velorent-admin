create table if not exists public.push_notification_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  audience text not null check (audience in ('customers', 'hosts', 'all')),
  link text,
  deeplink text,
  scheduled_at timestamptz not null default now(),
  status text not null default 'scheduled' check (status in ('draft', 'scheduled', 'processing', 'sent', 'cancelled', 'failed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  error_message text
);

create index if not exists idx_push_notification_campaigns_due
  on public.push_notification_campaigns (scheduled_at)
  where status = 'scheduled';

create table if not exists public.push_notification_jobs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.push_notification_campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  link text,
  deeplink text,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  attempts integer not null default 0,
  last_error text,
  scheduled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (campaign_id, user_id)
);

create index if not exists idx_push_notification_jobs_ready
  on public.push_notification_jobs (scheduled_at, status);

create table if not exists public.push_notification_automations (
  event_type text primary key,
  title text not null,
  message text not null,
  audience text not null check (audience in ('customer', 'host', 'both')),
  link_template text,
  deeplink_template text,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.push_notification_automations
  (event_type, title, message, audience, link_template, deeplink_template)
values
  ('user_registered', 'Welcome to Velorent', 'Your Velorent account is ready.', 'customer', '/profile', 'velorent://profile'),
  ('host_registered', 'Welcome host', 'Your host account is ready. Add a car to start earning.', 'host', '/profile', 'velorent://profile'),
  ('booking_created', 'Booking received', 'A new booking request has been created.', 'both', '/bookings/{{booking_id}}', 'velorent://bookings/{{booking_id}}'),
  ('booking_confirmed', 'Booking confirmed', 'Your booking has been confirmed.', 'both', '/bookings/{{booking_id}}', 'velorent://bookings/{{booking_id}}'),
  ('booking_cancelled', 'Booking cancelled', 'A booking has been cancelled.', 'both', '/bookings/{{booking_id}}', 'velorent://bookings/{{booking_id}}'),
  ('booking_rejected', 'Booking rejected', 'A booking request was rejected.', 'both', '/bookings/{{booking_id}}', 'velorent://bookings/{{booking_id}}'),
  ('document_submitted', 'Document submitted', 'Your document is waiting for review.', 'customer', '/profile', 'velorent://profile'),
  ('document_approved', 'Document verified', 'Your document verification was approved.', 'customer', '/profile', 'velorent://profile'),
  ('document_rejected', 'Document rejected', 'Your document verification was rejected. Please upload it again.', 'customer', '/profile', 'velorent://profile'),
  ('vehicle_submitted', 'Vehicle submitted', 'Your vehicle listing was submitted for admin review.', 'host', '/cars/{{car_id}}', 'velorent://cars/{{car_id}}'),
  ('vehicle_approved', 'Vehicle approved', 'Your vehicle is verified and live on Velorent.', 'host', '/cars/{{car_id}}', 'velorent://cars/{{car_id}}'),
  ('vehicle_rejected', 'Vehicle rejected', 'Your vehicle listing was rejected. Please review the details and submit again.', 'host', '/profile', 'velorent://profile')
on conflict (event_type) do nothing;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_push_notification_campaigns_updated_at on public.push_notification_campaigns;
create trigger set_push_notification_campaigns_updated_at
before update on public.push_notification_campaigns
for each row execute function public.set_updated_at();

drop trigger if exists set_push_notification_automations_updated_at on public.push_notification_automations;
create trigger set_push_notification_automations_updated_at
before update on public.push_notification_automations
for each row execute function public.set_updated_at();

create or replace function public.render_notification_template(
  p_template text,
  p_booking_id uuid default null,
  p_verification_id uuid default null,
  p_document_type text default null,
  p_car_id uuid default null
)
returns text
language sql
stable
as $$
  select replace(
    replace(
      replace(
        replace(coalesce(p_template, ''), '{{booking_id}}', coalesce(p_booking_id::text, '')),
        '{{car_id}}',
        coalesce(p_car_id::text, '')
      ),
      '{{verification_id}}',
      coalesce(p_verification_id::text, '')
    ),
    '{{document_type}}',
    coalesce(p_document_type, '')
  );
$$;

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

create or replace function public.enqueue_due_push_notification_campaigns()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign record;
  v_profile record;
  v_count integer := 0;
begin
  for v_campaign in
    select *
    from public.push_notification_campaigns
    where status = 'scheduled'
      and scheduled_at <= now()
    order by scheduled_at asc
    for update skip locked
  loop
    update public.push_notification_campaigns
    set status = 'processing', error_message = null
    where id = v_campaign.id;

    for v_profile in
      select id
      from public.profiles
      where (
        v_campaign.audience = 'all'
        or (v_campaign.audience = 'hosts' and role_id = 2)
        or (v_campaign.audience = 'customers' and role_id = 3)
      )
    loop
      perform public.enqueue_push_notification(
        v_profile.id,
        v_campaign.title,
        v_campaign.message,
        v_campaign.link,
        v_campaign.deeplink,
        v_campaign.id,
        now()
      );
      v_count := v_count + 1;
    end loop;

    update public.push_notification_campaigns
    set status = 'sent', sent_at = now()
    where id = v_campaign.id;
  end loop;

  return v_count;
exception
  when others then
    if v_campaign.id is not null then
      update public.push_notification_campaigns
      set status = 'failed', error_message = sqlerrm
      where id = v_campaign.id;
    end if;
    raise;
end;
$$;

create or replace function public.enqueue_automation_notification(
  p_event_type text,
  p_customer_id uuid default null,
  p_host_id uuid default null,
  p_booking_id uuid default null,
  p_verification_id uuid default null,
  p_document_type text default null,
  p_car_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_automation public.push_notification_automations%rowtype;
  v_title text;
  v_message text;
  v_link text;
  v_deeplink text;
begin
  select *
  into v_automation
  from public.push_notification_automations
  where event_type = p_event_type
    and is_enabled = true;

  if not found then
    return;
  end if;

  v_title := public.render_notification_template(v_automation.title, p_booking_id, p_verification_id, p_document_type, p_car_id);
  v_message := public.render_notification_template(v_automation.message, p_booking_id, p_verification_id, p_document_type, p_car_id);
  v_link := nullif(public.render_notification_template(v_automation.link_template, p_booking_id, p_verification_id, p_document_type, p_car_id), '');
  v_deeplink := nullif(public.render_notification_template(v_automation.deeplink_template, p_booking_id, p_verification_id, p_document_type, p_car_id), '');

  if v_automation.audience in ('customer', 'both') then
    perform public.enqueue_push_notification(p_customer_id, v_title, v_message, v_link, v_deeplink);
  end if;

  if v_automation.audience in ('host', 'both') then
    perform public.enqueue_push_notification(p_host_id, v_title, v_message, v_link, v_deeplink);
  end if;
end;
$$;

create or replace function public.handle_profile_push_automation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role_id = 2 then
    perform public.enqueue_automation_notification('host_registered', null, new.id);
  elsif new.role_id = 3 then
    perform public.enqueue_automation_notification('user_registered', new.id, null);
  end if;

  return new;
end;
$$;

drop trigger if exists profile_push_automation on public.profiles;
create trigger profile_push_automation
after insert on public.profiles
for each row execute function public.handle_profile_push_automation();

create or replace function public.handle_booking_push_automation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.enqueue_automation_notification(
      'booking_created',
      new.customer_id,
      new.host_id,
      new.id
    );
  elsif new.status is distinct from old.status then
    if new.status in ('approved', 'confirmed') then
      perform public.enqueue_automation_notification('booking_confirmed', new.customer_id, new.host_id, new.id);
    elsif new.status = 'cancelled' then
      perform public.enqueue_automation_notification('booking_cancelled', new.customer_id, new.host_id, new.id);
    elsif new.status = 'rejected' then
      perform public.enqueue_automation_notification('booking_rejected', new.customer_id, new.host_id, new.id);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists booking_push_automation on public.bookings;
create trigger booking_push_automation
after insert or update of status on public.bookings
for each row execute function public.handle_booking_push_automation();

create or replace function public.handle_car_push_automation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.enqueue_automation_notification(
      p_event_type => 'vehicle_submitted',
      p_host_id => new.host_id,
      p_car_id => new.id
    );

    return new;
  elsif tg_op = 'UPDATE' then
    if new.is_verified = true and old.is_verified is distinct from true then
      perform public.enqueue_automation_notification(
        p_event_type => 'vehicle_approved',
        p_host_id => new.host_id,
        p_car_id => new.id
      );
    end if;

    return new;
  elsif tg_op = 'DELETE' then
    if old.is_verified = false then
      perform public.enqueue_automation_notification(
        p_event_type => 'vehicle_rejected',
        p_host_id => old.host_id,
        p_car_id => old.id
      );
    end if;

    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists car_push_automation on public.cars;
create trigger car_push_automation
after insert or update of is_verified or delete on public.cars
for each row execute function public.handle_car_push_automation();

create or replace function public.handle_manual_verification_push_automation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.enqueue_automation_notification(
      'document_submitted',
      new.profile_id,
      null,
      null,
      new.id,
      new.document_type
    );
  elsif new.status is distinct from old.status then
    if new.status = 'approved' then
      perform public.enqueue_automation_notification(
        'document_approved',
        new.profile_id,
        null,
        null,
        new.id,
        new.document_type
      );
    elsif new.status = 'rejected' then
      perform public.enqueue_automation_notification(
        'document_rejected',
        new.profile_id,
        null,
        null,
        new.id,
        new.document_type
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists manual_verification_push_automation on public.manual_verifications;
create trigger manual_verification_push_automation
after insert or update of status on public.manual_verifications
for each row execute function public.handle_manual_verification_push_automation();
