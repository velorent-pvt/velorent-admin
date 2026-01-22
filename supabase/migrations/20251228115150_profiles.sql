drop table if exists profiles;

create table profiles (
  id uuid primary key
    references auth.users(id) on delete cascade,

  full_name text,
  email text unique,
  phone text,
  avatar_url text,

  role_id smallint
    references roles(id),

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);



create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id,
    full_name,
    email,
    phone,
    avatar_url,
    role_id
  )
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    coalesce(
      new.raw_user_meta_data->>'email',
      new.email
    ),
    new.phone,
    new.raw_user_meta_data->>'avatar_url',
    coalesce(
      (new.raw_user_meta_data->>'role_id')::smallint,
      3
    )
  );

  return new;
end;
$$ language plpgsql security definer;


drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();


