drop table if exists lead_events cascade;
drop table if exists lead_tasks cascade;

create table lead_events (
    id uuid primary key default gen_random_uuid(),
    
    lead_id uuid not null,
    lead_type text not null check (lead_type in ('customer', 'host', 'support')),
    
    event_type text not null check (event_type in ('system_activity', 'note', 'call')),
    
    title text not null,
    content text,
    
    call_duration_minutes integer,
    
    created_by uuid references profiles(id) on delete set null,
    
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table lead_tasks (
    id uuid primary key default gen_random_uuid(),
    
    lead_id uuid not null,
    lead_type text not null check (lead_type in ('customer', 'host', 'support')),
    
    title text not null,
    description text,
    
    due_date timestamptz,
    
    is_done boolean default false,
    
    assign_to uuid references profiles(id) on delete set null,
    created_by uuid references profiles(id) on delete set null,
    
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
