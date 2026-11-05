import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { rescheduleD7, toDateString } from '@/lib/scheduler'
import { TEST_USER_ID } from '@/lib/constants'
import { evaluateExplanation } from '@/lib/ai'
export const maxDuration = 30
const MIN_LENGTH = 30
const MAX_LENGTH = 5000

export async function POST(request: Request) {
  const { reviewId, text } = await request.json()

  if (!reviewId || typeof text !== 'string') {
    return NextResponse.json({ error: 'reviewId and text are required' }, { status: 400 })
  }

  const cleaned = text.trim()
  if (cleaned.length < MIN_LENGTH || cleaned.length > MAX_LENGTH) {
    return NextResponse.json(
      { error: `Explanation must be ${MIN_LENGTH} to ${MAX_LENGTH} characters` },
      { status: 400 }
    )
  }

  const { data: review } = await supabase
    .from('reviews')
    .select('*')
    .eq('id', reviewId)
    .eq('user_id', TEST_USER_ID)
    .single()

  if (!review) {
    return NextResponse.json({ error: 'Review not found' }, { status: 404 })
  }
  if (review.type !== 'd4') {
    return NextResponse.json({ error: 'Only day 4 reviews take an explanation' }, { status: 400 })
  }
  if (review.status !== 'pending') {
    return NextResponse.json({ error: 'Review already completed' }, { status: 409 })
  }

  const { error: saveError } = await supabase.from('explanations').insert({
    user_id: review.user_id,
    problem_id: review.problem_id,
    review_id: review.id,
    cycle_number: review.cycle_number,
    text: cleaned,
  })
  if (saveError) {
    return NextResponse.json({ error: saveError.message }, { status: 500 })
  }

  const { error: doneError } = await supabase
    .from('reviews')
    .update({ status: 'done', completed_at: new Date().toISOString() })
    .eq('id', reviewId)
  if (doneError) {
    return NextResponse.json({ error: doneError.message }, { status: 500 })
  }

  const { error: d7Error } = await supabase
    .from('reviews')
    .update({ due_date: toDateString(rescheduleD7(new Date())) })
    .eq('user_id', review.user_id)
    .eq('problem_id', review.problem_id)
    .eq('cycle_number', review.cycle_number)
    .eq('type', 'd7')
    .eq('status', 'pending')
  if (d7Error) {
    return NextResponse.json({ error: d7Error.message }, { status: 500 })
  }

    let gaps: string[] | null = null

  const { data: problem } = await supabase
    .from('problems')
    .select('title, intuition')
    .eq('id', review.problem_id)
    .single()

  if (problem?.intuition) {
    try {
      const ai = await evaluateExplanation({
        title: problem.title,
        intuition: problem.intuition,
        explanation: cleaned,
      })
      gaps = ai.gaps

      const { error: gapError } = await supabase
        .from('explanations')
        .update({ ai_gaps: JSON.stringify(ai.gaps) })
        .eq('review_id', review.id)
      if (gapError) console.error('Saving gaps failed:', gapError.message)

      const rows = ai.mcqs.map((q) => ({
        problem_id: review.problem_id,
        question: q.question,
        options: q.options,
        correct_index: q.correct_index,
        explanation: q.explanation,
        source: 'ai',
        user_id: review.user_id,
        cycle_number: review.cycle_number,
      }))

      const { error: mcqError } = await supabase.from('mcqs').insert(rows)
      if (mcqError) console.error('Saving MCQs failed:', mcqError.message)
    } catch (e) {
      console.error('AI evaluation failed:', e)
    }
  }

  return NextResponse.json({ success: true, gaps })
}