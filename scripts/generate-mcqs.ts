import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const apiKey = process.env.LLM_API_KEY
const model = process.env.LLM_MODEL

if (!url || !serviceKey) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
if (!apiKey || !model) throw new Error('Set LLM_API_KEY and LLM_MODEL in .env.local')

const supabase = createClient(url, serviceKey)

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey! },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
      }),
    }
  )

  if (res.status === 429) {
    console.log('    Rate limited, waiting 30s...')
    await sleep(30000)
    return callGemini(prompt) // retry
  }

  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`)
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

type McqRow = {
  problem_id: number
  question: string
  options: string[]
  correct_index: number
  explanation: string
  source: string
}

async function generateMcqs(problem: { id: number; title: string; intuition: string; difficulty: string | null }): Promise<McqRow[]> {
  const prompt = `You are a DSA (Data Structures and Algorithms) tutor. Generate exactly 5 multiple-choice questions to test a student's understanding of this problem.

Problem: ${problem.title}
Difficulty: ${problem.difficulty ?? 'Unknown'}

Key Intuition:
${problem.intuition}

Rules:
- Each question should test understanding of WHY this approach works, not just memorization
- Include questions about time/space complexity, edge cases, and when to apply this pattern
- Each question has exactly 4 options
- Vary which option (0-3) is correct across questions
- Keep questions and options concise

Return ONLY valid JSON in this exact format:
[{"question": "...", "options": ["A", "B", "C", "D"], "correct_index": 0, "explanation": "..."}]

Return an array of exactly 5 objects.`

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const raw = await callGemini(prompt)
      const cleaned = raw.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(cleaned)

      if (!Array.isArray(parsed) || parsed.length < 3) {
        throw new Error('Not enough questions')
      }

      return parsed.slice(0, 5).map((q: { question: string; options: string[]; correct_index: number; explanation: string }) => ({
        problem_id: problem.id,
        question: q.question,
        options: q.options,
        correct_index: q.correct_index,
        explanation: q.explanation,
        source: 'bank',
      }))
    } catch {
      if (attempt < 2) {
        console.log(`    Retry ${attempt + 1}...`)
        await sleep(2000)
      }
    }
  }

  throw new Error(`Failed after 3 attempts for: ${problem.title}`)
}

async function main() {
  // Check if MCQs already exist
  const { count } = await supabase.from('mcqs').select('*', { count: 'exact', head: true }).eq('source', 'bank')
  if (count && count > 0) {
    console.log(`Already have ${count} bank MCQs. Delete them first if you want to regenerate.`)
    console.log(`To delete: run in Supabase SQL Editor: DELETE FROM mcqs WHERE source = 'bank';`)
    return
  }

  // Get all problems with intuition
  const { data: problems, error } = await supabase
    .from('problems')
    .select('id, title, difficulty, intuition')
    .not('intuition', 'is', null)
    .order('id')

  if (error) throw new Error(error.message)
  if (!problems || problems.length === 0) {
    console.log('No problems found. Run importcsv.ts first.')
    return
  }

  console.log(`Generating MCQs for ${problems.length} problems...\n`)

  let success = 0
  let failed = 0

  for (let i = 0; i < problems.length; i++) {
    const p = problems[i]
    const progress = `[${i + 1}/${problems.length}]`

    try {
      console.log(`${progress} ${p.title}`)
      const mcqs = await generateMcqs(p)

      const { error: insertError } = await supabase.from('mcqs').insert(mcqs)
      if (insertError) {
        console.log(`    ❌ DB error: ${insertError.message}`)
        failed++
      } else {
        console.log(`    ✅ ${mcqs.length} MCQs saved`)
        success++
      }
    } catch (e) {
      console.log(`    ❌ ${(e as Error).message}`)
      failed++
    }

    // Delay between API calls to avoid rate limits (4 seconds)
    if (i < problems.length - 1) {
      await sleep(4000)
    }
  }

  console.log(`\nDone! ✅ ${success} problems, ❌ ${failed} failed`)
  console.log(`Total MCQs: ~${success * 5}`)
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
