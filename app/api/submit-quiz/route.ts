import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { startNewCycle } from '@/lib/reviews'
import { PASS_MARK } from '@/lib/scheduler'
import { getQuestionsForReview } from '@/lib/quiz'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  const serverSupabase = await createSupabaseServerClient()
  const { data: { user } } = await serverSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = user.id

  const { reviewId, answers } = await request.json()

  if (!reviewId || !answers) {
    return NextResponse.json({ error: 'reviewId and answers are required' }, { status: 400 })
  }

  const { data: review } = await supabase
    .from('reviews')
    .select('*')
    .eq('id', reviewId)
    .eq('user_id', userId)
    .single()

  if (!review) {
    return NextResponse.json({ error: 'Review not found' }, { status: 404 })
  }
  if (review.status !== 'pending') {
    return NextResponse.json({ error: 'Review already completed' }, { status: 409 })
  }
  if (review.type === 'd4') {
    return NextResponse.json({ error: 'Day 4 is not a quiz' }, { status: 400 })
  }

  const questions = await getQuestionsForReview(review)

  if (questions.length === 0) {
    return NextResponse.json({ error: 'No questions for this problem' }, { status: 400 })
  }

  const results = questions.map((q) => ({
    id: q.id,
    correct_index: q.correct_index,
    explanation: q.explanation,
    wasCorrect: answers[q.id] === q.correct_index,
  }))

  const score = results.filter((r) => r.wasCorrect).length
  const passed = review.type === 'd1' ? true : score >= PASS_MARK

  const { error: updateError } = await supabase
    .from('reviews')
    .update({
      status: passed ? 'done' : 'failed',
      score,
      completed_at: new Date().toISOString(),
    })
    .eq('id', reviewId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  if (!passed) {
    await startNewCycle(review.user_id, review.problem_id)
  }

  return NextResponse.json({ score, total: questions.length, passed, results })
}
