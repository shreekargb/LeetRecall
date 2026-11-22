import type { SupabaseClient } from '@supabase/supabase-js'

export type SavedExplanation = {
  id: number
  text: string
  feedback_status: 'pending' | 'processing' | 'ready' | 'failed' | 'unavailable'
  feedback_attempts: number
  scheduled_review_date: string | null
  gaps: string[] | null
}

export function parseGaps(value: string | null): string[] | null {
  if (value === null) return null
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) && parsed.every(gap => typeof gap === 'string') ? parsed : null
  } catch { return null }
}

export async function getSavedExplanation(supabase: SupabaseClient, userId: string, reviewId: number): Promise<SavedExplanation | null> {
  const { data, error } = await supabase.from('explanations')
    .select('id,text,ai_gaps,feedback_status,feedback_attempts,scheduled_review_date')
    .eq('user_id', userId).eq('review_id', reviewId).maybeSingle()
  if (error) throw new Error('Saved explanation could not be loaded')
  if (!data) return null
  return {
    id: data.id, text: data.text, feedback_status: data.feedback_status,
    feedback_attempts: data.feedback_attempts, scheduled_review_date: data.scheduled_review_date,
    gaps: parseGaps(data.ai_gaps),
  }
}
