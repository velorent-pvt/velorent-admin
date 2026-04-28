create or replace function public.handle_new_user()
returns trigger
as $$
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
    case
      when new.phone is not null and new.phone not like '+%'
        then '+' || new.phone
      else new.phone
    end,
    'https://covwleocjigusbqbkxdj.supabase.co/storage/v1/object/public/default/user.png',
    coalesce(
      (new.raw_user_meta_data->>'role_id')::smallint,
      3
    )
  );

  return new;
end;
$$ language plpgsql security definer;