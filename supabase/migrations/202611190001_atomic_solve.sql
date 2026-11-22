-- DEVELOPMENT: apply after the initial schema. Preserves existing progress.
begin;
create or replace function public.mark_problem_solved(p_problem_id integer)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_solved_at timestamptz;
  v_already_solved boolean := false;
  v_scheduled boolean := false;
  v_next_date date;
begin
  if v_user is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_problem_id is null or p_problem_id <= 0 then
    raise exception 'Invalid problem ID' using errcode = '22023';
  end if;
  if not exists (select 1 from public.problems where id = p_problem_id) then
    raise exception 'Problem not found' using errcode = 'P0002';
  end if;
  -- Serialize repeated/concurrent solves for this account and problem.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user::text || ':' || p_problem_id::text, 0)
  );
  select solved_at into v_solved_at from public.user_problems
    where user_id = v_user and problem_id = p_problem_id for update;
  v_already_solved := found;
  if not v_already_solved then
    v_solved_at := pg_catalog.now();
    insert into public.user_problems (user_id, problem_id, solved_at)
      values (v_user, p_problem_id, v_solved_at);
  end if;
  -- Recover legacy partial saves only if there is no review history.
  -- Retries must not reset completed, failed, expired or pending reviews.
  if not exists (
    select 1 from public.reviews where user_id = v_user and problem_id = p_problem_id
  ) then
    insert into public.reviews (user_id, problem_id, cycle_number, type, due_date)
      select v_user, p_problem_id, 1, r.review_type,
        (coalesce(v_solved_at, pg_catalog.now()) at time zone 'UTC')::date + r.days
      from (values ('d1', 1), ('d4', 4), ('d7', 7)) as r(review_type, days);
    v_scheduled := true;
  end if;
  select min(due_date) into v_next_date from public.reviews
    where user_id = v_user and problem_id = p_problem_id and status = 'pending';
  return pg_catalog.jsonb_build_object(
    'already_solved', v_already_solved, 'scheduled', v_scheduled,
    'next_review_date', v_next_date
  );
end;
$$;
-- Ownership comes only from the authenticated JWT, never a caller-supplied user ID.
revoke all on function public.mark_problem_solved(integer) from public, anon;
grant execute on function public.mark_problem_solved(integer) to authenticated;
-- Solved records must be created through the transactional function.
revoke insert on public.user_problems from authenticated;
commit;
