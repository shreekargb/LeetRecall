import { config } from 'dotenv'
import { readFileSync } from 'node:fs'
import Papa from 'papaparse'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

// Change the values on the right to match YOUR CSV's header names
const COLUMNS = {
  pattern: 'pattern',
  title: 'title',
  link: 'link',
  difficulty: 'difficulty',
  intuition: 'intuition',
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
}

const supabase = createClient(url, serviceKey)

type CsvRow = Record<string, string | undefined>
type CleanProblem = {
  pattern: string
  title: string
  link: string | null
  difficulty: string | null
  intuition: string | null
}

async function main() {
  const filePath = process.argv[2] ?? 'data/problems.csv'
  const text = readFileSync(filePath, 'utf8')

  const parsed = Papa.parse<CsvRow>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().replace(/^\uFEFF/, ''),
  })
  if (parsed.errors.length > 0) {
    console.warn('CSV warnings:', parsed.errors.slice(0, 5))
  }

  // 1. Clean the rows. A Map removes duplicate rows inside the CSV itself.
  const problems = new Map<string, CleanProblem>()
  let skipped = 0

  for (const row of parsed.data) {
    const pattern = row[COLUMNS.pattern]?.trim()
    const title = row[COLUMNS.title]?.trim()
    if (!pattern || !title) {
      skipped++
      continue
    }
    problems.set(`${pattern}||${title}`, {
      pattern,
      title,
      link: row[COLUMNS.link]?.trim() || null,
      difficulty: row[COLUMNS.difficulty]?.trim() || null,
      intuition: row[COLUMNS.intuition]?.trim() || null,
    })
  }

  // 2. Insert the patterns (or leave them if they exist) and get their ids.
  const patternNames = Array.from(new Set(Array.from(problems.values()).map((p) => p.pattern)))

  const { data: patternRows, error: patternError } = await supabase
    .from('patterns')
    .upsert(patternNames.map((name) => ({ name })), { onConflict: 'name' })
    .select('id, name')
  if (patternError) throw new Error(`Patterns: ${patternError.message}`)

  const patternIds = new Map(patternRows.map((p) => [p.name, p.id]))

  // 3. Insert the problems in chunks of 100.
  const problemRows = Array.from(problems.values()).map((p) => ({
    pattern_id: patternIds.get(p.pattern),
    title: p.title,
    link: p.link,
    difficulty: p.difficulty,
    intuition: p.intuition,
  }))

  for (let i = 0; i < problemRows.length; i += 100) {
    const chunk = problemRows.slice(i, i + 100)
    const { error } = await supabase
      .from('problems')
      .upsert(chunk, { onConflict: 'pattern_id,title' })
    if (error) throw new Error(`Problems (rows ${i + 1} to ${i + chunk.length}): ${error.message}`)
  }

  console.log(
    `Done. Patterns: ${patternNames.length}, problems: ${problemRows.length}, skipped rows: ${skipped}`
  )
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})