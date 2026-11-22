-- DEVELOPMENT ONLY. Run as postgres after migration 202611190004. Rolls back fixtures.
begin;
insert into public.patterns(id,name) values(2000000300,'Answer access test');
insert into public.problems(id,pattern_id,title) values(2000000300,2000000300,'Answer access');
insert into public.mcqs(id,problem_id,question,options,correct_index,explanation,source,user_id)
values
  (2000000300,2000000300,'Bank question','["A","B","C","D"]',2,'Private answer','bank',null),
  (2000000301,2000000300,'Own question','["A","B","C","D"]',1,'Private answer','ai','00000000-0000-0000-0000-000000000041'),
  (2000000302,2000000300,'Other question','["A","B","C","D"]',0,'Private answer','ai','00000000-0000-0000-0000-000000000042');
set local role anon;
do $$ begin
  begin perform question from public.mcqs; raise exception 'Anonymous question read allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000041","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  perform id,question,options,source from public.mcqs where problem_id=2000000300 order by id;
  if (select count(id) from public.mcqs where problem_id=2000000300) <> 2 then
    raise exception 'Question visibility changed'; end if;
  begin perform correct_index from public.mcqs; raise exception 'Answer key read allowed';
  exception when insufficient_privilege then null; end;
  begin perform explanation from public.mcqs; raise exception 'Answer explanation read allowed';
  exception when insufficient_privilege then null; end;
  begin perform * from public.mcqs; raise exception 'Wildcard leaked answers';
  exception when insufficient_privilege then null; end;
  begin perform id from public.mcqs where correct_index=0; raise exception 'Answer filter oracle allowed';
  exception when insufficient_privilege then null; end;
  begin perform id from public.mcqs order by correct_index; raise exception 'Answer ordering allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role service_role;
do $$ begin
  if (select correct_index from public.mcqs where id=2000000300) <> 2 then
    raise exception 'Server answer access broken'; end if;
end $$;
reset role;
rollback;
select 'Question fields readable; keys, explanations and answer filters denied; fixtures rolled back' as result;
