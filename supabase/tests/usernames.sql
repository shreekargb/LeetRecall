-- DEVELOPMENT ONLY. Run as postgres after username migration. All fixtures roll back.
begin;
insert into auth.users(id) values
  ('00000000-0000-0000-0000-000000000051'),
  ('00000000-0000-0000-0000-000000000052');
set local role anon;
do $$ begin
  begin perform public.choose_username('test_name'); raise exception 'Anonymous allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000051"}',true);
set local role authenticated;
do $$ begin
  begin perform public.choose_username('bad name'); raise exception 'Invalid name allowed';
  exception when invalid_parameter_value then null; end;
  if public.choose_username('  Test_Name_51  ') <> 'test_name_51' then raise exception 'Normalization failed'; end if;
  if public.choose_username('TEST_NAME_51') <> 'test_name_51' then raise exception 'Retry failed'; end if;
  begin perform public.choose_username('changed_name'); raise exception 'Unexpected rename';
  exception when sqlstate '55000' then null; end;
  begin update public.profiles set username='bypass_name'; raise exception 'Direct update allowed';
  exception when insufficient_privilege then null; end;
  begin insert into public.profiles(user_id,username) values('00000000-0000-0000-0000-000000000052','forged_name');
    raise exception 'Direct insert allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000052"}',true);
set local role authenticated;
do $$ begin
  if exists(select 1 from public.profiles where user_id='00000000-0000-0000-0000-000000000051') then
    raise exception 'Another profile visible';
  end if;
  begin perform public.choose_username('Test_Name_51'); raise exception 'Duplicate accepted';
  exception when unique_violation then null; end;
  if exists(select 1 from public.profiles) then raise exception 'Partial profile after duplicate rejection'; end if;
  perform public.choose_username('test_name_52');
end $$;
reset role;
do $$ begin
  if (select count(*) from public.profiles where username in ('test_name_51','test_name_52')) <> 2 then
    raise exception 'Profiles not independent';
  end if;
  if has_table_privilege('anon','public.profiles','SELECT')
    or has_table_privilege('authenticated','public.profiles','DELETE') then raise exception 'Unexpected grants'; end if;
end $$;
delete from auth.users where id='00000000-0000-0000-0000-000000000051';
do $$ begin
  if exists(select 1 from public.profiles where username='test_name_51') then raise exception 'Profile not deleted with account'; end if;
end $$;
rollback;
