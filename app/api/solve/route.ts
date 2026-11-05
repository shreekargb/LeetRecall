import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { scheduleReviews, toDateString } from '@/lib/scheduler'
import { TEST_USER_ID } from '@/lib/constants'
// Temporary fake user until login is built


export async function POST(request: Request) {
  const { problemId } = await request.json()
  console.log('Recieved Problemid : ',problemId)

  if (!problemId) {
    return NextResponse.json({ error: 'problemId is required' }, { status: 400 })
  }

  const { error: solveError } = await supabase
    .from('user_problems')
    .insert({ user_id: TEST_USER_ID, problem_id: problemId })
    console.log('Solve saved for problemId : ', problemId)

  if (solveError) {
    if (solveError.code === '23505') {
      return NextResponse.json({ error: 'Already marked as solved' }, { status: 409 })
    }
    return NextResponse.json({ error: solveError.message }, { status: 400 })
  }

  const reviews = scheduleReviews(new Date()).map((r) => ({
    user_id: TEST_USER_ID,
    problem_id: problemId,
    cycle_number: 1,
    type: r.type,
    due_date: toDateString(r.due_date),
  }))

  const { error: reviewError } = await supabase.from('reviews').insert(reviews)
  console.log("Reviews scheduled");

  if (reviewError) {
    return NextResponse.json({ error: reviewError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}