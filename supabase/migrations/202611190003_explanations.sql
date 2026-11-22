-- DEVELOPMENT. Requires the three previous migrations. Preserves existing records.
begin;
-- Fail rather than silently discard any historical duplicate explanations.
create unique index explanations_review_unique on public.explanations(review_id);
alter table public.explanations
  add column feedback_status text not null default 'pending'
    check (feedback_status in ('pending','processing','ready','failed','unavailable')),
  add column feedback_attempts integer not null default 0,
  add column feedback_started_at timestamptz,
  add column feedback_token uuid,
  add column scheduled_review_date date;
update public.explanations set feedback_status='ready' where ai_gaps is not null;

create function public.submit_explanation(p_review_id integer, p_text text)
returns integer language plpgsql security definer set search_path=''
as $$
declare
  v_user uuid := auth.uid();
  v_review public.reviews%rowtype;
  v_explanation public.explanations%rowtype;
  v_date date := (now() at time zone 'UTC')::date + 3;
  v_count integer;
begin
  if v_user is null then raise exception 'Sign in to save an explanation.' using errcode='42501'; end if;
  select * into v_review from public.reviews where id=p_review_id and user_id=v_user;
  if not found then raise exception 'Review not found.' using errcode='P0002'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text||':'||v_review.problem_id::text,0));
  select * into v_review from public.reviews where id=p_review_id and user_id=v_user for update;
  if not found then raise exception 'Review not found.' using errcode='P0002'; end if;
  if v_review.type <> 'd4' then raise exception 'This review requires a quiz.' using errcode='22023'; end if;
  select * into v_explanation from public.explanations where review_id=p_review_id and user_id=v_user;
  if found and v_review.status='done' then return v_explanation.id; end if;
  if v_review.status <> 'pending' then raise exception 'This review is no longer pending.' using errcode='55000'; end if;
  if v_review.due_date > (now() at time zone 'UTC')::date then
    raise exception 'This review is not due yet.' using errcode='55000';
  end if;
  if p_text is null or char_length(btrim(p_text)) not between 30 and 5000 then
    raise exception 'Write between 30 and 5000 characters.' using errcode='22023';
  end if;
  if v_explanation.id is null then
    insert into public.explanations(user_id,problem_id,review_id,cycle_number,text)
      values(v_user,v_review.problem_id,p_review_id,v_review.cycle_number,btrim(p_text))
      returning * into v_explanation;
  end if;
  update public.reviews set due_date=v_date
    where user_id=v_user and problem_id=v_review.problem_id and cycle_number=v_review.cycle_number
      and type='d7' and status='pending';
  get diagnostics v_count = row_count;
  if v_count <> 1 then raise exception 'Day 7 could not be scheduled. Please refresh and try again.' using errcode='55000'; end if;
  update public.explanations set scheduled_review_date=v_date where id=v_explanation.id;
  update public.reviews set status='done',completed_at=now() where id=p_review_id and user_id=v_user;
  return v_explanation.id;
end;
$$;
revoke all on function public.submit_explanation(integer,text) from public,anon;
grant execute on function public.submit_explanation(integer,text) to authenticated;

-- Only the server may claim AI work or persist generated feedback.
create function public.claim_explanation_feedback(p_review_id integer,p_user_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare e public.explanations%rowtype; v_token uuid; begin
  select * into e from public.explanations where review_id=p_review_id and user_id=p_user_id for update;
  if not found then raise exception 'Explanation not found.' using errcode='P0002'; end if;
  if e.feedback_status in ('ready','unavailable') then return null; end if;
  if e.feedback_status='processing' and e.feedback_started_at > now()-interval '60 seconds' then return null; end if;
  if e.feedback_attempts >= 3 then
    update public.explanations set feedback_status='failed',feedback_token=null where id=e.id;
    return null;
  end if;
  -- Keep the question set stable once Day 7 is available to the learner.
  if not exists(select 1 from public.reviews where user_id=p_user_id and problem_id=e.problem_id
    and cycle_number=e.cycle_number and type='d7' and status='pending'
    and due_date > (now() at time zone 'UTC')::date) then
    update public.explanations set feedback_status='unavailable',feedback_token=null where id=e.id;
    return null;
  end if;
  v_token := pg_catalog.gen_random_uuid();
  update public.explanations set feedback_status='processing',feedback_attempts=feedback_attempts+1,
    feedback_started_at=now(),feedback_token=v_token where id=e.id;
  return jsonb_build_object('id',e.id,'problem_id',e.problem_id,'text',e.text,'token',v_token);
end;
$$;

create function public.finish_explanation_feedback(
  p_id integer,p_user_id uuid,p_token uuid,p_result jsonb,p_failed boolean default false
) returns boolean language plpgsql security definer set search_path=''
as $$
declare e public.explanations%rowtype; q jsonb; begin
  select * into e from public.explanations where id=p_id and user_id=p_user_id;
  if not found then return false; end if;
  -- Same lock order as review submission, so a restart cannot race question replacement.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text||':'||e.problem_id::text,0));
  select * into e from public.explanations where id=p_id and user_id=p_user_id for update;
  if e.feedback_token is distinct from p_token or p_token is null or e.feedback_status <> 'processing' then return false; end if;
  if p_failed then
    update public.explanations set feedback_status='failed',feedback_token=null where id=e.id;
    return true;
  end if;
  if not exists(select 1 from public.reviews where user_id=p_user_id and problem_id=e.problem_id
    and cycle_number=e.cycle_number and type='d7' and status='pending'
    and due_date > (now() at time zone 'UTC')::date) then
    update public.explanations set feedback_status='unavailable',feedback_token=null where id=e.id;
    return true;
  end if;
  if p_result is null or jsonb_typeof(p_result->'gaps') is distinct from 'array'
    or jsonb_typeof(p_result->'mcqs') is distinct from 'array' then
    raise exception 'Invalid feedback payload' using errcode='22023';
  end if;
  if jsonb_array_length(p_result->'gaps') > 5 or jsonb_array_length(p_result->'mcqs') <> 5
    or exists(select 1 from jsonb_array_elements(p_result->'gaps') g where jsonb_typeof(g) <> 'string') then
    raise exception 'Invalid feedback payload' using errcode='22023';
  end if;
  for q in select value from jsonb_array_elements(p_result->'mcqs') loop
    if jsonb_typeof(q->'question') is distinct from 'string' or char_length(q->>'question') < 5
      or jsonb_typeof(q->'options') is distinct from 'array'
      or jsonb_typeof(q->'correct_index') is distinct from 'number'
      or (q->>'correct_index') not in ('0','1','2','3')
      or jsonb_typeof(q->'explanation') is distinct from 'string' then
      raise exception 'Invalid feedback question' using errcode='22023';
    end if;
    if jsonb_array_length(q->'options') <> 4 or exists(
      select 1 from jsonb_array_elements(q->'options') o where jsonb_typeof(o) <> 'string'
    ) then raise exception 'Invalid feedback options' using errcode='22023'; end if;
  end loop;
  delete from public.mcqs where user_id=p_user_id and problem_id=e.problem_id and cycle_number=e.cycle_number and source='ai';
  insert into public.mcqs(problem_id,question,options,correct_index,explanation,source,user_id,cycle_number)
    select e.problem_id,item->>'question',item->'options',(item->>'correct_index')::integer,
      item->>'explanation','ai',p_user_id,e.cycle_number
    from jsonb_array_elements(p_result->'mcqs') item;
  update public.explanations set ai_gaps=(p_result->'gaps')::text,
    feedback_status='ready',feedback_token=null where id=e.id;
  return true;
end;
$$;
revoke all on function public.claim_explanation_feedback(integer,uuid) from public,anon,authenticated;
revoke all on function public.finish_explanation_feedback(integer,uuid,uuid,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.claim_explanation_feedback(integer,uuid) to service_role;
grant execute on function public.finish_explanation_feedback(integer,uuid,uuid,jsonb,boolean) to service_role;

-- All app mutations now go through authenticated transition functions or server AI work.
revoke insert,update,delete on public.reviews,public.explanations,public.mcqs from authenticated;
commit;
