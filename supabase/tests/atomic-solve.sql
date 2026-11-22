-- DEVELOPMENT ONLY, postgres role. Run after both migrations and catalogue seed.
-- All fixture rows and test functions are rolled back; sequences may advance.
begin;
-- Use isolated positive IDs so the production input validation is exercised.
insert into public.patterns (id,name) values (2000000000,'Atomic solve test');
insert into public.problems (id,pattern_id,title) values
  (2000000000,2000000000,'Atomic solve A'),
  (2000000001,2000000000,'Atomic solve recovery'),
  (2000000002,2000000000,'Atomic solve rollback'),
  (2000000003,2000000000,'Atomic solve completed history');
insert into public.user_problems (user_id,problem_id,solved_at) values
  ('00000000-0000-0000-0000-000000000011',2000000001,'2026-01-01T12:00:00Z'),
  ('00000000-0000-0000-0000-000000000011',2000000003,'2026-01-01T12:00:00Z');
insert into public.reviews(user_id,problem_id,type,due_date,status)
  values('00000000-0000-0000-0000-000000000011',2000000003,'d1','2026-01-02','done');

create function public.atomic_solve_test_failure() returns trigger language plpgsql as $$
begin
  if new.problem_id=2000000002 then
    raise exception 'Injected review insert failure' using errcode='ZX001';
  end if;
  return new;
end $$;
create trigger atomic_solve_test_failure before insert on public.reviews
  for each row execute function public.atomic_solve_test_failure();

set local role anon;
do $$
begin
  begin
    perform public.mark_problem_solved(2000000000);
    raise exception 'Anonymous solve allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000011","role":"authenticated"}',true);
set local role authenticated;
do $$
declare result jsonb;
begin
  result := public.mark_problem_solved(2000000000);
  if result->>'already_solved' <> 'false' or result->>'scheduled' <> 'true' then
    raise exception 'First solve result incorrect';
  end if;
  result := public.mark_problem_solved(2000000000);
  if result->>'already_solved' <> 'true' or result->>'scheduled' <> 'false' then
    raise exception 'Repeat solve result incorrect';
  end if;
  if (select count(*) from public.reviews where problem_id=2000000000) <> 3
    or (select count(*) from public.user_problems where problem_id=2000000000) <> 1 then
    raise exception 'Duplicate or missing progress';
  end if;
  if exists (
    select 1 from public.reviews where problem_id=2000000000 and
    due_date <> (now() at time zone 'UTC')::date + case type when 'd1' then 1 when 'd4' then 4 when 'd7' then 7 end
  ) then raise exception 'Incorrect review dates'; end if;
  -- An already completed review must not be reset by another solve request.
  perform public.mark_problem_solved(2000000003);
  if not exists (select 1 from public.reviews where problem_id=2000000003 and type='d1' and status='done') then
    raise exception 'Retry reset history';
  end if;
  result := public.mark_problem_solved(2000000001);
  if result->>'already_solved' <> 'true' or result->>'scheduled' <> 'true'
    or (select due_date from public.reviews where problem_id=2000000001 and type='d1') <> date '2026-01-02' then
    raise exception 'Legacy partial solve recovery failed';
  end if;
  begin
    perform public.mark_problem_solved(2000000002);
    raise exception 'Injected failure did not occur';
  exception when sqlstate 'ZX001' then null;
  end;
  if exists (select 1 from public.user_problems where problem_id=2000000002)
    or exists (select 1 from public.reviews where problem_id=2000000002) then
    raise exception 'Partial save remained after failure';
  end if;
  begin
    insert into public.user_problems (user_id,problem_id)
      values ('00000000-0000-0000-0000-000000000011',2000000002);
    raise exception 'Direct insert bypass allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.mark_problem_solved(null);
    raise exception 'Invalid ID accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.mark_problem_solved(1999999999);
    raise exception 'Missing problem accepted';
  exception when no_data_found then null;
  end;
end $$;
reset role;

select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000012","role":"authenticated"}',true);
set local role authenticated;
do $$
begin
  if exists (select 1 from public.reviews where problem_id=2000000000) then
    raise exception 'User B can see user A reviews';
  end if;
  perform public.mark_problem_solved(2000000000);
  if (select count(*) from public.reviews where problem_id=2000000000) <> 3 then
    raise exception 'User B solve is not independent';
  end if;
end $$;
reset role;
do $$
begin
  if (select count(*) from public.reviews where problem_id=2000000000) <> 6 then
    raise exception 'User A progress changed';
  end if;
end $$;
rollback;
select 'Atomic solve tests passed; fixtures rolled back' as result;
