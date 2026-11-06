import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { rescheduleD7, toDateString } from '@/lib/scheduler'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  const serverSupabase = await createSupabaseServerClient()
  const { data: { user } } = await serverSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = user.id

  const { reviewId } = await request.json()

  if (!reviewId) {
    return NextResponse.json({ error: 'reviewId is required' }, { status: 400 })
  }

  const { data: review, error: findError } = await supabase
    .from('reviews')
    .select('*')
    .eq('id', reviewId)
    .eq('user_id', userId)
    .single()

  if (findError || !review) {
    return NextResponse.json({ error: 'Review not found' }, { status: 404 })
  }

  if (review.status !== 'pending') {
    return NextResponse.json({ error: 'Review already completed' }, { status: 409 })
  }

  const { error: updateError } = await supabase
    .from('reviews')
    .update({ status: 'done', completed_at: new Date().toISOString() })
    .eq('id', reviewId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  if (review.type === 'd4') {
    const newDate = toDateString(rescheduleD7(new Date()))

    const { error: d7Error } = await supabase
      .from('reviews')
      .update({ due_date: newDate })
      .eq('user_id', review.user_id)
      .eq('problem_id', review.problem_id)
      .eq('cycle_number', review.cycle_number)
      .eq('type', 'd7')
      .eq('status', 'pending')

    if (d7Error) {
      return NextResponse.json({ error: d7Error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
