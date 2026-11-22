-- DEVELOPMENT: apply after the four previous migrations. No records are changed.
begin;
-- Table-wide SELECT overrides column restrictions, so remove it first.
revoke select on public.mcqs from public, anon, authenticated;
revoke select (correct_index, explanation) on public.mcqs from public, anon, authenticated;
grant select (id, problem_id, question, options, source, user_id, cycle_number)
  on public.mcqs to authenticated;
-- Existing RLS still filters bank/own questions. SECURITY DEFINER grading and
-- service-role AI generation retain access to answers. Saved attempts stay owner-only.
commit;
