-- DEVELOPMENT ONLY, postgres role, after all four migrations. Fixtures roll back.
begin;
insert into public.patterns(id,name) values(2000000200,'Explanation tests');
insert into public.problems(id,pattern_id,title) values
  (2000000200,2000000200,'Explanation save'),(2000000201,2000000200,'Explanation rollback');
insert into public.reviews(id,user_id,problem_id,type,due_date) values
  (2000000200,'00000000-0000-0000-0000-000000000031',2000000200,'d4',current_date-1),
  (2000000201,'00000000-0000-0000-0000-000000000031',2000000200,'d7',current_date-1),
  (2000000202,'00000000-0000-0000-0000-000000000031',2000000201,'d4',current_date-1),
  (2000000203,'00000000-0000-0000-0000-000000000031',2000000201,'d7',current_date+1),
  (2000000204,'00000000-0000-0000-0000-000000000032',2000000200,'d4',current_date+10);
create function public.explanation_test_failure() returns trigger language plpgsql as $$
begin
  if new.id=2000000203 then raise exception 'Injected failure' using errcode='ZX003'; end if;
  return new;
end $$;
create trigger explanation_test_failure before update on public.reviews
  for each row execute function public.explanation_test_failure();

set local role anon;
do $$ begin
  begin perform public.submit_explanation(2000000200,repeat('a',40)); raise exception 'Anonymous save allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000031","role":"authenticated"}',true);
set local role authenticated;
do $$ declare first_id integer; repeat_id integer; begin
  begin perform public.submit_explanation(2000000204,repeat('a',40)); raise exception 'Cross-user save allowed';
  exception when no_data_found then null; end;
  begin perform public.submit_explanation(2000000201,repeat('a',40)); raise exception 'Wrong type allowed';
  exception when invalid_parameter_value then null; end;
  begin perform public.submit_explanation(2000000200,'short'); raise exception 'Short explanation allowed';
  exception when invalid_parameter_value then null; end;
  first_id := public.submit_explanation(2000000200,repeat('a',40));
  repeat_id := public.submit_explanation(2000000200,repeat('b',40));
  if first_id <> repeat_id or (select text from public.explanations where id=first_id) <> repeat('a',40)
    or (select count(*) from public.explanations where review_id=2000000200) <> 1 then
    raise exception 'Submission retry changed explanation';
  end if;
  if (select status from public.reviews where id=2000000200) <> 'done'
    or (select due_date from public.reviews where id=2000000201) <> (now() at time zone 'UTC')::date+3 then
    raise exception 'Atomic completion/scheduling failed';
  end if;
  begin perform public.submit_explanation(2000000202,repeat('a',40)); raise exception 'Injected failure absent';
  exception when sqlstate 'ZX003' then null; end;
  if exists(select 1 from public.explanations where review_id=2000000202)
    or (select status from public.reviews where id=2000000202) <> 'pending' then
    raise exception 'Partial save after failed scheduling';
  end if;
  begin update public.reviews set status='done' where id=2000000202; raise exception 'Direct review mutation allowed';
  exception when insufficient_privilege then null; end;
  begin update public.explanations set ai_gaps='[]' where id=first_id; raise exception 'Forged feedback allowed';
  exception when insufficient_privilege then null; end;
  begin perform public.claim_explanation_feedback(2000000200,'00000000-0000-0000-0000-000000000031');
    raise exception 'Client AI claim allowed'; exception when insufficient_privilege then null; end;
  begin perform public.finish_explanation_feedback(first_id,'00000000-0000-0000-0000-000000000031',null,null,true);
    raise exception 'Client AI finalize allowed'; exception when insufficient_privilege then null; end;
  begin insert into public.mcqs(problem_id,question,options,correct_index) values(2000000200,'Forged','[]',0);
    raise exception 'Client question injection allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;

set local role service_role;
do $$ declare claim jsonb; retry jsonb; payload jsonb; token uuid; uid uuid := '00000000-0000-0000-0000-000000000031'; begin
  claim := public.claim_explanation_feedback(2000000200,uid);
  if claim is null then raise exception 'Feedback claim failed'; end if;
  if public.claim_explanation_feedback(2000000200,uid) is not null then raise exception 'Duplicate active AI claim'; end if;
  token := (claim->>'token')::uuid;
  if public.finish_explanation_feedback((claim->>'id')::integer,uid,gen_random_uuid(),null,true) then
    raise exception 'Stale token accepted';
  end if;
  -- Provider failure is independent of saved explanation and review status.
  perform public.finish_explanation_feedback((claim->>'id')::integer,uid,token,null,true);
  if (select feedback_status from public.explanations where id=(claim->>'id')::integer) <> 'failed'
    or (select status from public.reviews where id=2000000200) <> 'done' then raise exception 'Failure lost progress'; end if;
  retry := public.claim_explanation_feedback(2000000200,uid);
  select jsonb_build_object('gaps',jsonb_build_array('Explain the invariant.'),'mcqs',jsonb_agg(jsonb_build_object(
    'question','Question '||n,'options',jsonb_build_array('A','B','C','D'),'correct_index',0,'explanation','Because'
  ))) into payload from generate_series(1,5) n;
  begin
    perform public.finish_explanation_feedback((retry->>'id')::integer,uid,(retry->>'token')::uuid,'{}');
    raise exception 'Invalid AI payload accepted';
  exception when invalid_parameter_value then null; end;
  perform public.finish_explanation_feedback((retry->>'id')::integer,uid,(retry->>'token')::uuid,payload);
  if (select feedback_status from public.explanations where review_id=2000000200) <> 'ready'
    or (select count(*) from public.mcqs where problem_id=2000000200 and source='ai' and user_id=uid) <> 5 then
    raise exception 'Feedback/questions were not saved together';
  end if;
  if public.finish_explanation_feedback((retry->>'id')::integer,uid,(retry->>'token')::uuid,payload) then
    raise exception 'Duplicate finalization accepted';
  end if;
  if public.claim_explanation_feedback(2000000200,uid) is not null then raise exception 'Ready feedback regenerated'; end if;
end $$;
reset role;

-- A stalled worker can be replaced; the old token cannot overwrite its successor.
update public.explanations set feedback_status='processing',feedback_attempts=1,
  feedback_started_at=now()-interval '2 minutes',feedback_token='00000000-0000-0000-0000-000000000099'
  where review_id=2000000200;
set local role service_role;
do $$ declare claim jsonb; uid uuid := '00000000-0000-0000-0000-000000000031'; begin
  claim := public.claim_explanation_feedback(2000000200,uid);
  if claim is null then raise exception 'Stalled worker was not replaced'; end if;
  if public.finish_explanation_feedback((claim->>'id')::integer,uid,'00000000-0000-0000-0000-000000000099',null,true) then
    raise exception 'Old worker overwrote successor'; end if;
  perform public.finish_explanation_feedback((claim->>'id')::integer,uid,(claim->>'token')::uuid,null,true);
  claim := public.claim_explanation_feedback(2000000200,uid);
  perform public.finish_explanation_feedback((claim->>'id')::integer,uid,(claim->>'token')::uuid,null,true);
  if public.claim_explanation_feedback(2000000200,uid) is not null then raise exception 'Retry budget exceeded'; end if;
end $$;
reset role;
update public.explanations set feedback_status='pending',feedback_attempts=0 where review_id=2000000200;
update public.reviews set due_date=(now() at time zone 'UTC')::date where id=2000000201;
set local role service_role;
do $$ declare claim jsonb; begin
  claim := public.claim_explanation_feedback(2000000200,'00000000-0000-0000-0000-000000000031');
  if claim is not null or (select feedback_status from public.explanations where review_id=2000000200) <> 'unavailable' then
    raise exception 'Due quiz question set was not frozen'; end if;
end $$;
reset role;

select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000032","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  if exists(select 1 from public.explanations where review_id=2000000200) then raise exception 'Cross-user explanation visible'; end if;
  begin perform public.submit_explanation(2000000204,repeat('a',40)); raise exception 'Early explanation accepted';
  exception when object_not_in_prerequisite_state then null; end;
end $$;
reset role;
rollback;
select 'Explanation transactions and feedback permissions passed; fixtures rolled back' as result;
