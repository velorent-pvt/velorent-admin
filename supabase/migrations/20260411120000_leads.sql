drop table if exists support_leads cascade;
drop table if exists host_leads cascade;
drop table if exists customer_leads cascade;

create table customer_leads (
    id uuid primary key default gen_random_uuid(),
    salutation text not null,
    first_name text not null,
    last_name text not null,
    email text,
    mobile text not null,
    address text,
    gender text not null,
    lead_source text not null,
    pickup_date date,
    dropoff_date date,
    budget_range text,
    status text not null default 'New',
    assign_to uuid references profiles(id) on delete set null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table host_leads (
    id uuid primary key default gen_random_uuid(),
    salutation text not null,
    first_name text not null,
    last_name text not null,
    email text,
    mobile text not null,
    address text,
    gender text not null,
    lead_source text not null,
    car_model text,
    car_year text,
    fuel_type text,
    status text not null default 'New',
    assign_to uuid references profiles(id) on delete set null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table support_leads (
    id uuid primary key default gen_random_uuid(),
    salutation text not null,
    first_name text not null,
    last_name text not null,
    email text,
    mobile text not null,
    gender text not null,
    lead_source text not null,
    issue_type text not null,
    issue_summary text not null,
    issue_detail text not null,
    status text not null default 'New',
    assign_to uuid references profiles(id) on delete set null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
