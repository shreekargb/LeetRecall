-- DEVELOPMENT: apply after the existing migrations. Does not alter study data.
begin;
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z][a-z0-9_]{2,23}$'),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;
create policy own_profile_read on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));

create function public.choose_username(p_username text)
returns text language plpgsql security definer set search_path=''
as $$
declare
  v_user uuid := auth.uid();
  v_name text := lower(btrim(p_username));
  v_existing text;
begin
  if v_user is null then raise exception 'Sign in to choose a username.' using errcode='42501'; end if;
  if v_name is null or v_name !~ '^[a-z][a-z0-9_]{2,23}$' then
    raise exception 'Use 3-24 letters, numbers or underscores, starting with a letter.' using errcode='22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('username:'||v_user::text,0));
  select username into v_existing from public.profiles where user_id=v_user;
  if found then
    if v_existing=v_name then return v_existing; end if;
    raise exception 'You have already chosen a username. Refresh to continue.' using errcode='55000';
  end if;
  insert into public.profiles(user_id,username) values(v_user,v_name);
  return v_name;
end;
$$;
revoke all on function public.choose_username(text) from public, anon;
grant execute on function public.choose_username(text) to authenticated;
commit;
