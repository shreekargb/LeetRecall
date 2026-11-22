-- DEVELOPMENT ONLY. Fixtures are rolled back; sequences may advance.
begin;
insert into public.patterns(id,name) values(2000000400,'Undo test');
insert into public.problems(id,pattern_id,title) values
  (2000000400,2000000400,'Undo target'),(2000000401,2000000400,'Keep other problem');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000041"}',true);
set local role authenticated;
select public.mark_problem_solved(2000000400);
select public.mark_problem_solved(2000000401);
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000042"}',true);
set local role authenticated;
select public.mark_problem_solved(2000000400);
reset role;
insert into public.quiz_attempts(review_id,user_id,answers,outcome)
  select id,user_id,'{}','{}' from public.reviews where problem_id=2000000400 and type='d1';
insert into public.explanations(user_id,problem_id,review_id,cycle_number,text,feedback_token,feedback_status)
  select user_id,problem_id,id,1,'Saved explanation for undo test',
    '00000000-0000-0000-0000-000000000099','processing'
  from public.reviews where problem_id=2000000400 and type='d4';
insert into public.mcqs(problem_id,question,options,correct_index,source,user_id)
values
  (2000000400,'Bank question','["a","b","c","d"]',0,'bank',null),
  (2000000400,'User A question','["a","b","c","d"]',0,'ai','00000000-0000-0000-0000-000000000041'),
  (2000000400,'User B question','["a","b","c","d"]',0,'ai','00000000-0000-0000-0000-000000000042');

-- Force a failure after dependent deletions and assert everything rolls back.
create function public.undo_test_failure() returns trigger language plpgsql as $$
begin raise exception 'Injected undo failure' using errcode='ZX001'; end $$;
create trigger undo_test_failure before delete on public.user_problems
  for each row execute function public.undo_test_failure();
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000041"}',true);
set local role authenticated;
do $$ begin
  begin
    perform public.undo_problem_solved(2000000400);
    raise exception 'Expected rollback failure';
  exception when sqlstate 'ZX001' then null; end;
  if (select count(*) from public.reviews where problem_id=2000000400) <> 3
    or (select count(*) from public.quiz_attempts) <> 1
    or (select count(*) from public.explanations where problem_id=2000000400) <> 1 then
    raise exception 'Partial deletion after failed undo';
  end if;
end $$;
reset role;
drop trigger undo_test_failure on public.user_problems;

set local role anon;
do $$ begin
  begin perform public.undo_problem_solved(2000000400);
    raise exception 'Anonymous undo allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
do $$ begin
  begin perform public.undo_problem_solved(-1);
    raise exception 'Invalid ID allowed';
  exception when invalid_parameter_value then null; end;
end $$;
select public.undo_problem_solved(2000000400);
select public.undo_problem_solved(2000000400);
reset role;
do $$ begin
  if exists(select 1 from public.reviews where problem_id=2000000400 and user_id='00000000-0000-0000-0000-000000000041')
    or exists(select 1 from public.user_problems where problem_id=2000000400 and user_id='00000000-0000-0000-0000-000000000041')
    or exists(select 1 from public.explanations where problem_id=2000000400 and user_id='00000000-0000-0000-0000-000000000041')
    or exists(select 1 from public.quiz_attempts where user_id='00000000-0000-0000-0000-000000000041')
    or exists(select 1 from public.mcqs where problem_id=2000000400 and user_id='00000000-0000-0000-0000-000000000041') then
    raise exception 'Own records remain after undo';
  end if;
  if (select count(*) from public.reviews where problem_id=2000000400 and user_id='00000000-0000-0000-0000-000000000042') <> 3
    or (select count(*) from public.quiz_attempts where user_id='00000000-0000-0000-0000-000000000042') <> 1
    or (select count(*) from public.explanations where user_id='00000000-0000-0000-0000-000000000042') <> 1
    or (select count(*) from public.mcqs where problem_id=2000000400) <> 2
    or (select count(*) from public.reviews where problem_id=2000000401) <> 3
    or not exists(select 1 from public.problems where id=2000000400) then
    raise exception 'Undo affected another user, problem or bank questions';
  end if;
end $$;
set local role authenticated;
select public.mark_problem_solved(2000000400);
select public.mark_problem_solved(2000000400);
do $$ begin
  if (select count(*) from public.reviews where problem_id=2000000400) <> 3 then
    raise exception 'Re-solving did not produce exactly three fresh reviews';
  end if;
end $$;
reset role;
rollback;
