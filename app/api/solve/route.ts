import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const SolveInput = z.object({ problemId: z.number().int().positive().max(2147483647) })

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in to save your progress.' }, { status: 401 })

  const input = SolveInput.safeParse(await request.json().catch(() => null))
  if (!input.success) {
    return NextResponse.json({ error: 'A valid problem ID is required.' }, { status: 400 })
  }
  const { data, error } = await supabase.rpc('mark_problem_solved', { p_problem_id: input.data.problemId })
  if (error) {
    if (error.code === 'P0002') {
      return NextResponse.json({ error: 'This problem could not be found.' }, { status: 404 })
    }
    console.error('Saving solved problem failed:', error.code)
    return NextResponse.json({ error: 'Could not save your progress. Please try again.' }, { status: 500 })
  }
  return NextResponse.json({
    success: true,
    alreadySolved: data.already_solved,
    scheduled: data.scheduled,
    nextReviewDate: data.next_review_date,
  })
}
