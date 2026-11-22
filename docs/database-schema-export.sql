-- Run in the ORIGINAL Supabase project's SQL Editor.
-- Read-only: returns database structure, never application rows or credentials.
-- Copy the single JSON result or download the result as CSV.
-- This is an inspection report, not executable migration SQL.
with app_tables as (
  select unnest(array[
    'patterns', 'problems', 'user_problems', 'reviews', 'explanations', 'mcqs'
  ]) as name
)
select jsonb_pretty(jsonb_build_object(
  'columns', (
    select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
      select table_name, column_name, data_type, udt_name, is_nullable,
             column_default, is_identity, identity_generation,
             is_generated, generation_expression
      from information_schema.columns
      where table_schema = 'public' and table_name in (select name from app_tables)
      order by table_name, ordinal_position
    ) x
  ),
  'constraints', (
    select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
      select c.relname as table_name, con.conname as name,
             pg_get_constraintdef(con.oid) as definition
      from pg_constraint con
      join pg_class c on c.oid = con.conrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname in (select name from app_tables)
      order by c.relname, con.conname
    ) x
  ),
  'indexes', (
    select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
      select tablename, indexname, indexdef from pg_indexes
      where schemaname = 'public' and tablename in (select name from app_tables)
      order by tablename, indexname
    ) x
  ),
  'row_security', (
    select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
      select c.relname as table_name, c.relrowsecurity as enabled,
             c.relforcerowsecurity as forced
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname in (select name from app_tables)
      order by c.relname
    ) x
  ),
  'policies', (
    select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
      select tablename, policyname, permissive, roles, cmd, qual, with_check
      from pg_policies
      where schemaname = 'public' and tablename in (select name from app_tables)
      order by tablename, policyname
    ) x
  ),
  'grants', (
    select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
      select table_name, grantee, privilege_type
      from information_schema.role_table_grants
      where table_schema = 'public' and table_name in (select name from app_tables)
        and grantee in ('anon', 'authenticated', 'service_role')
      order by table_name, grantee, privilege_type
    ) x
  ),
  'triggers', (
    select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
      select c.relname as table_name, t.tgname as name,
             pg_get_triggerdef(t.oid) as definition,
             p.oid::regprocedure::text as function_name
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      join pg_proc p on p.oid = t.tgfoid
      where not t.tgisinternal and n.nspname = 'public'
        and c.relname in (select name from app_tables)
      order by c.relname, t.tgname
    ) x
  )
)) as schema_report;
