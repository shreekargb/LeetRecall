-- DEVELOPMENT: apply after initial_schema and atomic_solve.
begin;
create table public.quiz_attempts (
  review_id integer primary key references public.reviews(id),
  user_id uuid not null,
  answers jsonb not null,
  outcome jsonb not null,
  created_at timestamptz not null default now()
);
create index quiz_attempts_user_idx on public.quiz_attempts(user_id);
alter table public.quiz_attempts enable row level security;
revoke all on public.quiz_attempts from public, anon, authenticated;
grant select on public.quiz_attempts to authenticated;
grant all on public.quiz_attempts to service_role;
create policy own_attempt_read on public.quiz_attempts for select to authenticated
  using (user_id = (select auth.uid()));

create function public.submit_quiz(p_review_id integer, p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_review public.reviews%rowtype;
  v_outcome jsonb;
  v_questions jsonb;
  v_results jsonb := '[]'::jsonb;
  v_public_questions jsonb := '[]'::jsonb;
  v_q jsonb;
  v_key text;
  v_source text := 'bank';
  v_score integer := 0;
  v_correct boolean;
  v_restart boolean;
  v_cycle integer;
  v_today date := (now() at time zone 'UTC')::date;
begin
  if v_user is null then raise exception 'Sign in to submit a quiz.' using errcode='42501'; end if;
  -- Find ownership before locking; then share the same problem lock as solve.
  select * into v_review from public.reviews where id=p_review_id and user_id=v_user;
  if not found then raise exception 'Review not found.' using errcode='P0002'; end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user::text || ':' || v_review.problem_id::text,0)
  );
  select * into v_review from public.reviews where id=p_review_id and user_id=v_user for update;
  if not found then raise exception 'Review not found.' using errcode='P0002'; end if;
  -- A retry after a lost response returns the original, immutable result.
  select outcome into v_outcome from public.quiz_attempts where review_id=p_review_id and user_id=v_user;
  if found then return v_outcome; end if;
  if v_review.type not in ('d1','d7') then
    raise exception 'This review requires an explanation.' using errcode='22023';
  end if;
  if v_review.status <> 'pending' then
    raise exception 'This review is no longer pending.' using errcode='55000';
  end if;
  if v_review.due_date > v_today then
    raise exception 'This review is not due yet.' using errcode='55000';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Answer all five questions.' using errcode='22023';
  end if;
  if v_review.type='d7' and exists (
    select 1 from public.mcqs where problem_id=v_review.problem_id and source='ai'
      and user_id=v_user and cycle_number=v_review.cycle_number
  ) then v_source := 'ai'; end if;
  select jsonb_agg(to_jsonb(q) order by q.id) into v_questions from public.mcqs q
    where q.problem_id=v_review.problem_id and q.source=v_source
      and ((v_source='bank' and q.user_id is null)
        or (v_source='ai' and q.user_id=v_user and q.cycle_number=v_review.cycle_number));
  if coalesce(jsonb_array_length(v_questions),0) <> 5 then
    raise exception 'This quiz is not ready. Please try again later.' using errcode='55000';
  end if;
  if (select count(*) from jsonb_object_keys(p_answers)) <> 5 then
    raise exception 'Answer exactly the five questions shown.' using errcode='22023';
  end if;
  for v_q in select value from jsonb_array_elements(v_questions) loop
    v_key := v_q->>'id';
    if not (p_answers ? v_key) or jsonb_typeof(p_answers->v_key) <> 'number'
      or (p_answers->>v_key) not in ('0','1','2','3') then
      raise exception 'The question set or answers are invalid. Reload the quiz.' using errcode='22023';
    end if;
    v_correct := (p_answers->>v_key)::integer = (v_q->>'correct_index')::integer;
    if v_correct then v_score := v_score + 1; end if;
    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'id',v_q->'id','correct_index',v_q->'correct_index',
      'explanation',v_q->'explanation','wasCorrect',v_correct
    ));
    v_public_questions := v_public_questions || jsonb_build_array(jsonb_build_object(
      'id',v_q->'id','question',v_q->'question','options',v_q->'options'
    ));
  end loop;
  v_restart := v_review.type='d7' and v_score < 3;
  update public.reviews set status=case when v_restart then 'failed' else 'done' end,
    score=v_score, completed_at=now() where id=p_review_id and user_id=v_user;
  if v_restart then
    select coalesce(max(cycle_number),0)+1 into v_cycle from public.reviews
      where user_id=v_user and problem_id=v_review.problem_id;
    -- Superseded pending reviews must not expire the newly created cycle later.
    update public.reviews set status='expired'
      where user_id=v_user and problem_id=v_review.problem_id and status='pending';
    insert into public.reviews(user_id,problem_id,cycle_number,type,due_date)
      select v_user,v_review.problem_id,v_cycle,r.t,v_today+r.days
      from (values ('d1',1),('d4',4),('d7',7)) r(t,days);
  end if;
  v_outcome := jsonb_build_object('score',v_score,'total',5,'passed',v_score>=3,
    'reviewType',v_review.type,'restarted',v_restart,'results',v_results,
    'answers',p_answers,'questions',v_public_questions);
  insert into public.quiz_attempts(review_id,user_id,answers,outcome)
    values(p_review_id,v_user,p_answers,v_outcome);
  return v_outcome;
end;
$$;
revoke all on function public.submit_quiz(integer,jsonb) from public,anon;
grant execute on function public.submit_quiz(integer,jsonb) to authenticated;
commit;
