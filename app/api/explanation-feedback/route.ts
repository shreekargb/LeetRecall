import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getSavedExplanation } from '@/lib/explanations'
import { evaluateExplanation } from '@/lib/ai'

export const maxDuration = 30
const Input = z.object({ reviewId: z.number().int().positive().max(2147483647) })

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in to view feedback.' }, { status: 401 })
  const input = Input.safeParse(await request.json().catch(() => null))
  if (!input.success) return NextResponse.json({ error: 'A valid review is required.' }, { status: 400 })
  const reviewId = input.data.reviewId
  try {
    // Verify ownership before obtaining privileged access. Never accept a user ID or AI payload from the client.
    const saved = await getSavedExplanation(supabase, user.id, reviewId)
    if (!saved) return NextResponse.json({ error: 'Saved explanation not found.' }, { status: 404 })
    const admin = createSupabaseAdminClient()
    const { data: claim, error: claimError } = await admin.rpc('claim_explanation_feedback', {
      p_review_id: reviewId, p_user_id: user.id,
    })
    if (claimError) throw new Error('Unable to claim feedback')
    if (claim) {
      try {
        const { data: problem, error } = await supabase.from('problems').select('title,intuition').eq('id', claim.problem_id).single()
        if (error || !problem?.intuition) throw new Error('Reference unavailable')
        const ai = await evaluateExplanation({ title: problem.title, intuition: problem.intuition, explanation: claim.text })
        const { error: finishError } = await admin.rpc('finish_explanation_feedback', {
          p_id: claim.id, p_user_id: user.id, p_token: claim.token, p_result: ai,
        })
        if (finishError) throw new Error('Feedback save failed')
      } catch {
        // Saving the explanation has already succeeded. Feedback may be retried separately.
        const { error } = await admin.rpc('finish_explanation_feedback', {
          p_id: claim.id, p_user_id: user.id, p_token: claim.token, p_result: null, p_failed: true,
        })
        if (error) throw new Error('Feedback status could not be saved')
      }
    }
    return NextResponse.json({ explanation: await getSavedExplanation(supabase, user.id, reviewId) })
  } catch {
    return NextResponse.json({ error: 'Your explanation is safe. Feedback could not be loaded; please try again later.' }, { status: 503 })
  }
}
