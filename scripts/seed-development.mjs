import { readFile } from 'node:fs/promises'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { config } from 'dotenv'
import Papa from 'papaparse'
import { createClient } from '@supabase/supabase-js'

async function main() {
  const parsed = Papa.parse(await readFile(new URL('../data/problems.csv', import.meta.url), 'utf8'), {
    header: true, skipEmptyLines: true, transformHeader: h => h.trim().replace(/^\uFEFF/, ''),
  })
  if (parsed.errors.length) throw new Error('Invalid problems CSV; no writes performed')
  const problems = parsed.data
  const entries = JSON.parse(await readFile(new URL('../data/mcqs.json', import.meta.url), 'utf8'))
  const titles = new Set(problems.map(p => p.title))
  if (titles.size !== problems.length || problems.some(p => !p.pattern || !p.title)) {
    throw new Error('Missing or ambiguous problem titles; no writes performed')
  }
  const questionKeys = new Set()
  for (const entry of entries) {
    if (!titles.has(entry.title) || !Array.isArray(entry.mcqs) || entry.mcqs.length !== 5) {
      throw new Error('Invalid question-to-problem mapping; no writes performed')
    }
    for (const q of entry.mcqs) {
      const key = JSON.stringify([entry.title, q.question])
      if (questionKeys.has(key) || typeof q.question !== 'string' || !q.question.trim()
        || !Array.isArray(q.options) || q.options.length !== 4
        || q.options.some(o => typeof o !== 'string')
        || !Number.isInteger(q.correct_index) || q.correct_index < 0 || q.correct_index > 3
        || typeof q.explanation !== 'string') throw new Error('Invalid or duplicate question; no writes performed')
      questionKeys.add(key)
    }
  }
  console.log(`Catalogue valid: ${new Set(problems.map(p => p.pattern)).size} patterns, ${problems.length} problems, ${questionKeys.size} questions`)
  if (process.argv.includes('--check-only')) return

  config({ path: '.env.local', quiet: true })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Development Supabase URL and service-role key are required in .env.local')
  const target = new URL(url)
  if (target.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/.test(target.hostname)) {
    throw new Error('Expected a hosted Supabase project URL')
  }
  const projectRef = target.hostname.split('.')[0]
  console.log(`Target project reference: ${projectRef}`)
  console.log('Compare this with your DEVELOPMENT project dashboard URL. Do not continue if this is production.')
  console.log('This imports catalogue data only. Run one seed process at a time; partial imports can be retried.')
  const prompt = createInterface({ input: stdin, output: stdout })
  let answer
  try { answer = await prompt.question('Type the development project reference to confirm: ') }
  finally { prompt.close() }
  if (answer.trim() !== projectRef) throw new Error('Confirmation did not match; no writes performed')
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const checked = async (label, query) => {
    const result = await query
    if (result.error) throw new Error(`${label}: ${result.error.code ?? ''} ${result.error.message}`)
    return result.data
  }
  // Ensure all required tables exist before starting a multi-request import.
  for (const table of ['patterns', 'problems', 'mcqs']) {
    await checked(`Check ${table}`, db.from(table).select('id').limit(1))
  }
  const patternRows = await checked('Import patterns', db.from('patterns')
    .upsert([...new Set(problems.map(p => p.pattern))].map(name => ({ name })), { onConflict: 'name' }).select('id,name'))
  const patternIds = new Map(patternRows.map(p => [p.name, p.id]))
  const problemRows = await checked('Import problems', db.from('problems').upsert(problems.map(p => ({
    pattern_id: patternIds.get(p.pattern), title: p.title, link: p.link || null,
    difficulty: p.difficulty || null, intuition: p.intuition || null,
  })), { onConflict: 'pattern_id,title' }).select('id,title'))
  const problemIds = new Map(problemRows.map(p => [p.title, p.id]))
  let inserted = 0
  for (const entry of entries) {
    const problemId = problemIds.get(entry.title)
    const existing = new Set()
    for (let offset = 0; ; offset += 500) {
      const page = await checked('Read existing questions', db.from('mcqs').select('question')
        .eq('problem_id', problemId).eq('source', 'bank').order('id').range(offset, offset + 499))
      page.forEach(q => existing.add(q.question))
      if (page.length < 500) break
    }
    const missing = entry.mcqs.filter(q => !existing.has(q.question)).map(q => ({
      problem_id: problemId, question: q.question, options: q.options,
      correct_index: q.correct_index, explanation: q.explanation, source: 'bank',
    }))
    if (missing.length) await checked(`Import questions for ${entry.title}`, db.from('mcqs').insert(missing))
    inserted += missing.length
  }
  console.log(`Import complete. Added ${inserted} missing bank questions; existing questions were preserved.`)
  for (const table of ['patterns', 'problems', 'mcqs']) {
    let query = db.from(table).select('id', { count: 'exact', head: true })
    if (table === 'mcqs') query = query.eq('source', 'bank')
    const result = await query
    if (result.error) throw new Error(`Count ${table}: ${result.error.message}`)
    console.log(`${table}: ${result.count}`)
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1 })
