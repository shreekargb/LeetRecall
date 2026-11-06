import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(url, key)

async function check() {
  const patterns = await supabase.from('patterns').select('*', { count: 'exact', head: true })
  const problems = await supabase.from('problems').select('*', { count: 'exact', head: true })
  const mcqs = await supabase.from('mcqs').select('*', { count: 'exact', head: true }).eq('source', 'bank')
  const aiMcqs = await supabase.from('mcqs').select('*', { count: 'exact', head: true }).eq('source', 'ai')
  const reviews = await supabase.from('reviews').select('*', { count: 'exact', head: true })
  const explanations = await supabase.from('explanations').select('*', { count: 'exact', head: true })
  const userProblems = await supabase.from('user_problems').select('*', { count: 'exact', head: true })

  console.log('=== SUPABASE DATABASE STATUS ===')
  console.log(`Patterns:       ${patterns.count}`)
  console.log(`Problems:       ${problems.count}`)
  console.log(`Bank MCQs:      ${mcqs.count}`)
  console.log(`AI MCQs:        ${aiMcqs.count}`)
  console.log(`Reviews:        ${reviews.count}`)
  console.log(`Explanations:   ${explanations.count}`)
  console.log(`User Problems:  ${userProblems.count}`)
  console.log('================================')
}

check().catch((e) => {
  console.error('Error:', e.message)
  process.exit(1)
})
