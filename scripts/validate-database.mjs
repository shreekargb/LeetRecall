// Local-only SQL verification. Pass the installed @electric-sql/pglite directory.
// No environment credentials are loaded and no Supabase connection is made.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

if (!process.argv[2]) throw new Error('Pass the local @electric-sql/pglite package directory')
const { PGlite } = await import(pathToFileURL(resolve(process.argv[2], 'dist/index.js')).href)
const db = new PGlite()
try {
  // Supabase-specific identity scaffolding for this disposable in-memory database.
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
    $$;
    grant usage on schema auth to anon, authenticated;
  `)
  await db.exec(await readFile(new URL('../supabase/migrations/202611140001_initial_schema.sql', import.meta.url), 'utf8'))
  console.log('Initial schema: passed')
  const seed = await readFile(new URL('../supabase/seed.sql', import.meta.url), 'utf8')
  for (let attempt = 1; attempt <= 2; attempt++) {
    await db.exec(seed)
    const { rows } = await db.query(`select
      (select count(*)::int from public.patterns) as patterns,
      (select count(*)::int from public.problems) as problems,
      (select count(*)::int from public.mcqs where source='bank') as mcqs`)
    assert.deepEqual(rows[0], { patterns: 25, problems: 193, mcqs: 965 })
    console.log(`Seed execution ${attempt}: 25 patterns, 193 problems, 965 questions`)
  }
  await db.exec(await readFile(new URL('../supabase/tests/user-isolation.sql', import.meta.url), 'utf8'))
  const { rows } = await db.query('select count(*)::int as count from public.patterns where id=-900001')
  assert.equal(rows[0].count, 0)
  console.log('Isolation assertions and rollback: passed')

  const repair = await readFile(new URL('../supabase/repair-catalogue-encoding.sql', import.meta.url), 'utf8')
  if (repair.trim()) {
    // Reproduce the hosted encoding duplicates using the reviewed catalogue-only fixture.
    const duplicates = JSON.parse(await readFile(new URL('../docs/catalogue-repair-expected.json', import.meta.url), 'utf8'))
    for (const q of duplicates) {
      await db.query(`insert into public.mcqs
        (id, problem_id, question, options, correct_index, explanation, source)
        values ($1,$2,$3,$4::jsonb,$5,$6,'bank')`,
      [q.bad_id, q.problem_id, q.question, JSON.stringify(q.options), q.correct_index, q.explanation])
    }
    // Unexpected edits must abort, not be silently deleted.
    await db.query('update public.mcqs set explanation=$1 where id=$2', ['Changed since report', duplicates[0].bad_id])
    await assert.rejects(db.exec(repair), /reported duplicate changed/)
    await db.exec('rollback')
    assert.equal((await db.query("select count(*)::int as n from public.mcqs where source='bank'")).rows[0].n, 977)
    await db.query('update public.mcqs set explanation=$1 where id=$2', [duplicates[0].explanation, duplicates[0].bad_id])
    await db.exec(repair)
    await db.exec(repair)
    assert.equal((await db.query("select count(*)::int as n from public.mcqs where source='bank'")).rows[0].n, 965)
    console.log('Encoding repair, repeat execution and changed-row guard: passed')
  } else {
    console.log('Historical encoding repair test skipped: repair file is empty')
  }
  const atomicMigration = await readFile(new URL('../supabase/migrations/202611190001_atomic_solve.sql', import.meta.url), 'utf8')
  await db.exec(atomicMigration)
  await db.exec(atomicMigration)
  await db.exec(await readFile(new URL('../supabase/tests/atomic-solve.sql', import.meta.url), 'utf8'))
  console.log('Atomic solve, repeat migration, retries, ownership, legacy recovery and failure rollback: passed')
  await db.exec(await readFile(new URL('../supabase/migrations/202611190002_quiz_attempts.sql', import.meta.url), 'utf8'))
  await db.exec(await readFile(new URL('../supabase/tests/quiz-attempts.sql', import.meta.url), 'utf8'))
  console.log('Quiz scoring, immutable retries, ownership, invalid/early submissions and restart rollback: passed')
  await db.exec(await readFile(new URL('../supabase/migrations/202611190003_explanations.sql', import.meta.url), 'utf8'))
  const answerMigration = await readFile(new URL('../supabase/migrations/202611190004_protect_quiz_answers.sql', import.meta.url), 'utf8')
  await db.exec(answerMigration)
  await db.exec(answerMigration)
  const undoMigration = await readFile(new URL('../supabase/migrations/202611220001_undo_solved.sql', import.meta.url), 'utf8')
  await db.exec(undoMigration)
  await db.exec(undoMigration)
  await db.exec(await readFile(new URL('../supabase/migrations/202611220002_usernames.sql', import.meta.url), 'utf8'))
  for (const test of ['user-isolation', 'atomic-solve', 'quiz-attempts', 'explanations', 'quiz-answer-access', 'undo-solved', 'usernames']) {
    await db.exec(await readFile(new URL(`../supabase/tests/${test}.sql`, import.meta.url), 'utf8'))
  }
  console.log('Final-schema regression: isolation, solve, quiz, explanations, server-only feedback, protected answer keys, undo solved and usernames: passed')
} finally {
  await db.close()
}
