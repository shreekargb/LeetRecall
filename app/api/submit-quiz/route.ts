import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const Input = z.object({
  reviewId: z.number().int().positive().max(2147483647),
  answers: z.record(z.string().regex(/^[1-9]\d*$/), z.number().int().min(0).max(3))
    .refine(answers => Object.keys(answers).length === 5),
})

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in to submit your quiz.' }, { status: 401 })
  const input = Input.safeParse(await request.json().catch(() => null))
  if (!input.success) {
    return NextResponse.json({ error: 'Answer all five questions before submitting.' }, { status: 400 })
  }
  const { data, error } = await supabase.rpc('submit_quiz', {
    p_review_id: input.data.reviewId, p_answers: input.data.answers,
  })
  if (error) {
    const status = error.code === 'P0002' ? 404 : error.code === '22023' ? 400 : error.code === '55000' ? 409 : 500
    if (status === 500) console.error('Quiz submission failed:', error.code)
    return NextResponse.json({ error: status === 500
      ? 'Could not save your quiz. Please retry; your result will not be duplicated.'
      : error.message }, { status })
  }
  return NextResponse.json(data)
}
