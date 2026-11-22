-- DEVELOPMENT ONLY, postgres role. Synthetic records are rolled back.
begin;
insert into public.patterns(id,name) values (2000000100,'Quiz transaction test');
insert into public.problems(id,pattern_id,title) values
  (2000000100,2000000100,'Quiz test'),(2000000101,2000000100,'Quiz rollback test');
insert into public.mcqs(id,problem_id,question,options,correct_index,source)
  select 2000000100+n,2000000100,'Question '||n,'["A","B","C","D"]'::jsonb,n%4,'bank'
  from generate_series(0,4) n;
insert into public.mcqs(id,problem_id,question,options,correct_index,source)
  select 2000000110+n,2000000101,'Question '||n,'["A","B","C","D"]'::jsonb,n%4,'bank'
  from generate_series(0,4) n;
insert into public.mcqs(id,problem_id,question,options,correct_index,source,user_id,cycle_number)
  select 2000000120+n,2000000100,'Personal question '||n,'["A","B","C","D"]'::jsonb,n%4,'ai',
    '00000000-0000-0000-0000-000000000022'::uuid,1 from generate_series(0,4) n;
insert into public.mcqs(id,problem_id,question,options,correct_index,source,user_id,cycle_number)
  select 2000000130+n,2000000100,'Other cycle question '||n,'["A","B","C","D"]'::jsonb,n%4,'ai',
    '00000000-0000-0000-0000-000000000021'::uuid,99 from generate_series(0,4) n;
insert into public.reviews(id,user_id,problem_id,type,due_date) values
  (2000000100,'00000000-0000-0000-0000-000000000021',2000000100,'d1',current_date-1),
  (2000000101,'00000000-0000-0000-0000-000000000021',2000000100,'d7',current_date-1),
  (2000000102,'00000000-0000-0000-0000-000000000021',2000000100,'d1',current_date+10),
  (2000000103,'00000000-0000-0000-0000-000000000022',2000000100,'d7',current_date-1),
  (2000000104,'00000000-0000-0000-0000-000000000021',2000000101,'d7',current_date-1),
  (2000000105,'00000000-0000-0000-0000-000000000021',2000000100,'d4',current_date-1);

create function public.quiz_test_failure() returns trigger language plpgsql as $$
begin
  if new.problem_id=2000000101 and new.cycle_number > 1 then
    raise exception 'Injected restart failure' using errcode='ZX002';
  end if;
  return new;
end $$;
create trigger quiz_test_failure before insert on public.reviews
  for each row execute function public.quiz_test_failure();

set local role anon;
do $$ begin
  begin
    perform public.submit_quiz(2000000100,'{}');
    raise exception 'Anonymous submission accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from public.quiz_attempts;
    raise exception 'Anonymous attempt read accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000021","role":"authenticated"}',true);
set local role authenticated;
do $$
declare wrong_answers jsonb; correct_answers jsonb; rollback_answers jsonb; first_result jsonb; repeated jsonb;
begin
  -- Answers are known from synthetic fixtures, not read using learner privileges.
  select jsonb_object_agg((2000000100+n)::text,(n%4+1)%4),jsonb_object_agg((2000000100+n)::text,n%4)
    into wrong_answers,correct_answers from generate_series(0,4) n;
  select jsonb_object_agg((2000000110+n)::text,(n%4+1)%4) into rollback_answers
    from generate_series(0,4) n;
  begin
    perform public.submit_quiz(2000000103,correct_answers);
    raise exception 'Cross-user submission accepted';
  exception when no_data_found then null; end;
  begin
    perform public.submit_quiz(2000000102,correct_answers);
    raise exception 'Early submission accepted';
  exception when object_not_in_prerequisite_state then null; end;
  begin
    perform public.submit_quiz(2000000105,correct_answers);
    raise exception 'Explanation bypass accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.submit_quiz(2000000100,'{}');
    raise exception 'Incomplete answers accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.submit_quiz(2000000100,'[]');
    raise exception 'Invalid answer shape accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.submit_quiz(2000000100,jsonb_set(correct_answers,'{2000000100}','4'));
    raise exception 'Invalid option accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.submit_quiz(2000000100,(correct_answers-'2000000100') || '{"1999999999":0}'::jsonb);
    raise exception 'Foreign question accepted';
  exception when invalid_parameter_value then null; end;

  first_result := public.submit_quiz(2000000100,wrong_answers);
  if first_result->>'score' <> '0' or first_result->>'passed' <> 'false'
    or first_result->>'restarted' <> 'false'
    or (select status from public.reviews where id=2000000100) <> 'done' then
    raise exception 'Day 1 completion semantics failed';
  end if;
  repeated := public.submit_quiz(2000000100,correct_answers);
  if repeated <> first_result then raise exception 'Retry changed saved result'; end if;
  if (select count(*) from public.quiz_attempts where review_id=2000000100) <> 1 then
    raise exception 'Duplicate attempt';
  end if;
  if first_result->'results'->0->>'correct_index' <> '0'
    or first_result->'questions'->0 ? 'correct_index'
    or (select outcome from public.quiz_attempts where review_id=2000000100) <> first_result then
    raise exception 'Post-submission feedback or saved result broken';
  end if;
  begin
    update public.quiz_attempts set answers='{}' where review_id=2000000100;
    raise exception 'Client attempt mutation accepted';
  exception when insufficient_privilege then null; end;

  first_result := public.submit_quiz(2000000101,wrong_answers);
  repeated := public.submit_quiz(2000000101,wrong_answers);
  if repeated <> first_result or first_result->>'restarted' <> 'true'
    or (select count(*) from public.reviews where problem_id=2000000100 and cycle_number=2) <> 3 then
    raise exception 'Restart duplicated or missing';
  end if;
  if exists(select 1 from public.reviews where problem_id=2000000100 and cycle_number=1 and status='pending') then
    raise exception 'Superseded reviews still pending';
  end if;
  begin
    perform public.submit_quiz(2000000104,rollback_answers);
    raise exception 'Injected failure did not occur';
  exception when sqlstate 'ZX002' then null; end;
  if (select status from public.reviews where id=2000000104) <> 'pending'
    or exists(select 1 from public.quiz_attempts where review_id=2000000104)
    or exists(select 1 from public.reviews where problem_id=2000000101 and cycle_number>1) then
    raise exception 'Partial result after failure';
  end if;
end $$;
reset role;

select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000022","role":"authenticated"}',true);
set local role authenticated;
do $$ declare answers jsonb; result jsonb; begin
  if exists(select 1 from public.quiz_attempts where review_id in (2000000100,2000000101)) then
    raise exception 'Cross-user result visibility';
  end if;
  select jsonb_object_agg((2000000120+n)::text,n%4) into answers from generate_series(0,4) n;
  result := public.submit_quiz(2000000103,answers);
  if result->>'score' <> '5' or result->>'passed' <> 'true' or result->>'restarted' <> 'false'
    or result->'questions'->0->>'id' <> '2000000120' then
    raise exception 'Personalized Day 7 scoring failed';
  end if;
end $$;
reset role;
rollback;
select 'Quiz transaction tests passed; fixtures rolled back' as result;
