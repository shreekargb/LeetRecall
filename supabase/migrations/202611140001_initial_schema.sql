-- DEVELOPMENT PROJECT ONLY. Initial schema for an empty database.
-- Based on the supplied production metadata; intentionally replaces Allow all policies.
-- No DROP statements or production data. Existing tables cause a rollback.
begin;
set local search_path = public;

create table public.patterns (
  id serial primary key,
  name text not null unique
);
create table public.problems (
  id serial primary key,
  pattern_id integer references public.patterns(id) on delete cascade,
  title text not null,
  link text,
  difficulty text,
  intuition text,
  unique (pattern_id, title)
);
create table public.user_problems (
  id serial primary key,
  user_id uuid not null,
  problem_id integer references public.problems(id) on delete cascade,
  solved_at timestamptz default now(),
  unique (user_id, problem_id)
);
create table public.reviews (
  id serial primary key,
  user_id uuid not null,
  problem_id integer references public.problems(id) on delete cascade,
  cycle_number integer not null default 1,
  type text not null,
  due_date date not null,
  status text not null default 'pending',
  score integer,
  completed_at timestamptz
);
create table public.explanations (
  id serial primary key,
  user_id uuid not null,
  problem_id integer references public.problems(id) on delete cascade,
  review_id integer references public.reviews(id),
  cycle_number integer not null default 1,
  text text not null,
  ai_gaps text
);
create table public.mcqs (
  id serial primary key,
  problem_id integer references public.problems(id) on delete cascade,
  question text not null,
  options jsonb not null,
  correct_index integer not null,
  explanation text,
  source text not null default 'bank',
  user_id uuid,
  cycle_number integer
);

create index reviews_user_due_idx on public.reviews (user_id, status, due_date);
create index reviews_user_cycle_idx on public.reviews (user_id, problem_id, cycle_number);
create index explanations_user_idx on public.explanations (user_id, review_id);
create index mcqs_lookup_idx on public.mcqs (problem_id, source, user_id, cycle_number);

alter table public.patterns enable row level security;
alter table public.problems enable row level security;
alter table public.user_problems enable row level security;
alter table public.reviews enable row level security;
alter table public.explanations enable row level security;
alter table public.mcqs enable row level security;

-- Override Supabase default grants; ordinary clients cannot mutate the catalogue.
revoke all on public.patterns, public.problems, public.user_problems,
  public.reviews, public.explanations, public.mcqs from public, anon, authenticated;
revoke all on sequence public.patterns_id_seq, public.problems_id_seq,
  public.user_problems_id_seq, public.reviews_id_seq,
  public.explanations_id_seq, public.mcqs_id_seq from public, anon, authenticated;

grant select on public.patterns, public.problems to anon, authenticated;
grant select, insert on public.user_problems to authenticated;
grant select, insert, update on public.reviews, public.explanations to authenticated;
grant select, insert on public.mcqs to authenticated;
grant usage on sequence public.user_problems_id_seq, public.reviews_id_seq,
  public.explanations_id_seq, public.mcqs_id_seq to authenticated;
grant all on public.patterns, public.problems, public.user_problems,
  public.reviews, public.explanations, public.mcqs to service_role;
grant all on sequence public.patterns_id_seq, public.problems_id_seq,
  public.user_problems_id_seq, public.reviews_id_seq,
  public.explanations_id_seq, public.mcqs_id_seq to service_role;

create policy catalogue_read on public.patterns for select to anon, authenticated using (true);
create policy catalogue_read on public.problems for select to anon, authenticated using (true);

create policy own_progress_read on public.user_problems for select to authenticated
  using ((select auth.uid()) = user_id);
create policy own_progress_insert on public.user_problems for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy own_review_read on public.reviews for select to authenticated
  using ((select auth.uid()) = user_id);
create policy own_review_insert on public.reviews for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy own_review_update on public.reviews for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy own_explanation_read on public.explanations for select to authenticated
  using ((select auth.uid()) = user_id);
create policy own_explanation_insert on public.explanations for insert to authenticated
  with check (
    (select auth.uid()) = user_id and exists (
      select 1 from public.reviews r where r.id = review_id
        and r.user_id = (select auth.uid())
        and r.problem_id = explanations.problem_id
        and r.cycle_number = explanations.cycle_number and r.type = 'd4'
    )
  );
create policy own_explanation_update on public.explanations for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id and exists (
      select 1 from public.reviews r where r.id = review_id
        and r.user_id = (select auth.uid())
        and r.problem_id = explanations.problem_id
        and r.cycle_number = explanations.cycle_number and r.type = 'd4'
    )
  );

create policy bank_or_own_questions on public.mcqs for select to authenticated
  using ((source = 'bank' and user_id is null)
    or (source = 'ai' and user_id = (select auth.uid())));
create policy own_ai_questions_insert on public.mcqs for insert to authenticated
  with check (source = 'ai' and user_id = (select auth.uid()) and exists (
    select 1 from public.reviews r where r.user_id = (select auth.uid())
      and r.problem_id = mcqs.problem_id and r.cycle_number = mcqs.cycle_number
      and r.type = 'd4'
  ));

commit;
