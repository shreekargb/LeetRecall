import { config } from 'dotenv'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
}

const supabase = createClient(url, serviceKey)

type McqEntry = {
  title: string
  mcqs: {
    question: string
    options: string[]
    correct_index: number
    explanation: string
  }[]
}

async function main() {
  const filePath = process.argv[2] ?? 'data/mcqs.json'
  const raw = readFileSync(filePath, 'utf8')
  const entries: McqEntry[] = JSON.parse(raw)

  console.log(`Loaded ${entries.length} problems from JSON\n`)

  // Get all problems from DB to map title -> id
  const { data: problems, error: fetchError } = await supabase
    .from('problems')
    .select('id, title')

  if (fetchError) throw new Error(`Failed to fetch problems: ${fetchError.message}`)
  if (!problems || problems.length === 0) {
    throw new Error('No problems in DB. Run importcsv.ts first!')
  }

  const titleToId = new Map(problems.map((p) => [p.title, p.id]))
  console.log(`Found ${problems.length} problems in DB\n`)

  let totalInserted = 0
  let skipped = 0

  // Process in chunks of 10 problems
  for (let i = 0; i < entries.length; i += 10) {
    const chunk = entries.slice(i, i + 10)
    const rows: {
      problem_id: number
      question: string
      options: string[]
      correct_index: number
      explanation: string
      source: string
    }[] = []

    for (const entry of chunk) {
      const problemId = titleToId.get(entry.title)
      if (!problemId) {
        console.log(`⚠️  No match for: "${entry.title}"`)
        skipped++
        continue
      }

      for (const mcq of entry.mcqs) {
        rows.push({
          problem_id: problemId,
          question: mcq.question,
          options: mcq.options,
          correct_index: mcq.correct_index,
          explanation: mcq.explanation,
          source: 'bank',
        })
      }
    }

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from('mcqs').insert(rows)
      if (insertError) {
        console.log(`❌ Insert error (rows ${i + 1}-${i + chunk.length}): ${insertError.message}`)
      } else {
        totalInserted += rows.length
        console.log(`✅ Inserted MCQs for problems ${i + 1}-${i + chunk.length}`)
      }
    }
  }

  console.log(`\nDone! Inserted: ${totalInserted} MCQs, Skipped: ${skipped} problems`)
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
