import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSavedExplanation } from '@/lib/explanations'

const Input = z.object({
  reviewId: z.number().int().positive().max(2147483647),
  text: z.string().trim().min(30).max(5000),
})

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in to save your explanation.' }, { status: 401 })
  const input = Input.safeParse(await request.json().catch(() => null))
  if (!input.success) return NextResponse.json({ error: 'Write between 30 and 5000 characters for a valid review.' }, { status: 400 })
  const { error } = await supabase.rpc('submit_explanation', { p_review_id: input.data.reviewId, p_text: input.data.text })
  if (error) {
    const status = error.code === 'P0002' ? 404 : error.code === '22023' ? 400 : error.code === '55000' ? 409 : 500
    return NextResponse.json({ error: status === 500 ? 'Could not save your explanation. Please retry safely.' : error.message }, { status })
  }
  try {
    return NextResponse.json({ explanation: await getSavedExplanation(supabase, user.id, input.data.reviewId) })
  } catch {
    return NextResponse.json({ error: 'Your explanation was saved, but confirmation could not be loaded. Retry or refresh to recover it.' }, { status: 503 })
  }
}
