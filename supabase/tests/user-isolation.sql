-- DEVELOPMENT ONLY. Run after the initial schema, as the SQL Editor's postgres role.
-- Synthetic rows are rolled back. A failed assertion raises an exception.
begin;
insert into public.patterns (id,name) values (-900001,'Isolation test');
insert into public.problems (id,pattern_id,title) values (-900001,-900001,'Isolation test');
insert into public.user_problems (id,user_id,problem_id) values
  (-900001,'00000000-0000-0000-0000-000000000001',-900001),
  (-900002,'00000000-0000-0000-0000-000000000002',-900001);
insert into public.reviews (id,user_id,problem_id,type,due_date) values
  (-900001,'00000000-0000-0000-0000-000000000001',-900001,'d4',current_date),
  (-900002,'00000000-0000-0000-0000-000000000002',-900001,'d4',current_date);
insert into public.explanations (id,user_id,problem_id,review_id,text) values
  (-900001,'00000000-0000-0000-0000-000000000001',-900001,-900001,'A'),
  (-900002,'00000000-0000-0000-0000-000000000002',-900001,-900002,'B');
insert into public.mcqs (id,problem_id,question,options,correct_index,source,user_id,cycle_number) values
  (-900001,-900001,'A','["a","b","c","d"]',0,'ai','00000000-0000-0000-0000-000000000001',1),
  (-900002,-900001,'B','["a","b","c","d"]',0,'ai','00000000-0000-0000-0000-000000000002',1);

set local role anon;
do $$
begin
  if not exists (select 1 from public.patterns where id=-900001) then
    raise exception 'Anonymous catalogue read failed';
  end if;
  begin
    perform 1 from public.reviews;
    raise exception 'Anonymous review read was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.patterns set name='Changed' where id=-900001;
    raise exception 'Anonymous catalogue update was allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
do $$
declare affected integer;
begin
  if (select count(*) from public.user_problems where id in (-900001,-900002)) <> 1
     or (select count(*) from public.reviews where id in (-900001,-900002)) <> 1
     or (select count(*) from public.explanations where id in (-900001,-900002)) <> 1
     or (select count(*) from public.mcqs where id in (-900001,-900002)) <> 1 then
    raise exception 'Owner read isolation failed';
  end if;
  -- The initial schema permits owner writes; later migrations require RPCs.
  if has_table_privilege(current_user,'public.reviews','UPDATE') then
    update public.reviews set status='done' where id=-900002;
    get diagnostics affected = row_count;
    if affected <> 0 then raise exception 'Cross-user update allowed'; end if;
    update public.reviews set status='done' where id=-900001;
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Own update denied'; end if;
  end if;
  begin
    insert into public.reviews (user_id,problem_id,type,due_date)
      values ('00000000-0000-0000-0000-000000000002',-900001,'d1',current_date);
    raise exception 'Spoofed owner insert allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.reviews set user_id='00000000-0000-0000-0000-000000000002' where id=-900001;
    raise exception 'Owner reassignment allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.explanations (user_id,problem_id,review_id,text)
      values ('00000000-0000-0000-0000-000000000001',-900001,-900002,'Wrong review');
    raise exception 'Cross-user review attachment allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;
select 'Isolation assertions passed; synthetic rows rolled back' as result;
