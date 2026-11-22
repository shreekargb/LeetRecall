-- Apply in DEVELOPMENT after the five existing migrations.
begin;
create or replace function public.undo_problem_solved(p_problem_id integer)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_problem_id is null or p_problem_id <= 0 then
    raise exception 'Invalid problem ID' using errcode='22023';
  end if;
  -- Same lock as solve, quiz submission, explanations and AI finalization.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user::text || ':' || p_problem_id::text, 0)
  );
  delete from public.quiz_attempts a using public.reviews r
    where a.review_id=r.id and a.user_id=v_user
      and r.user_id=v_user and r.problem_id=p_problem_id;
  delete from public.explanations where user_id=v_user and problem_id=p_problem_id;
  delete from public.mcqs where user_id=v_user and problem_id=p_problem_id and source='ai';
  delete from public.reviews where user_id=v_user and problem_id=p_problem_id;
  delete from public.user_problems where user_id=v_user and problem_id=p_problem_id;
end;
$$;
revoke all on function public.undo_problem_solved(integer) from public, anon;
grant execute on function public.undo_problem_solved(integer) to authenticated;
commit;
