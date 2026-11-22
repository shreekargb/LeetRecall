import type { SupabaseClient } from '@supabase/supabase-js'

export type HistoryParams = Record<string, string | string[] | undefined>
export function parseHistoryParams(params: HistoryParams) {
  return {
    type: typeof params.type === 'string' && ['d1', 'd4', 'd7'].includes(params.type) ? params.type : '',
    page: typeof params.page === 'string' && /^[1-9]\d{0,5}$/.test(params.page) ? Number(params.page) : 1,
  }
}
export function historyHref(type: string, page = 1) {
  const query = new URLSearchParams()
  if (['d1', 'd4', 'd7'].includes(type)) query.set('type', type)
  if (page > 1) query.set('page', String(page))
  return `/history${query.size ? `?${query}` : ''}`
}
export type HistoryReview = {
  id: number; type: string; status: string; score: number | null; completed_at: string | null;
  cycle_number: number; problems: { title: string } | null
}
export async function getReviewHistory(client: SupabaseClient, userId: string, params: ReturnType<typeof parseHistoryParams>) {
  let query = client.from('reviews')
    .select('id,type,status,score,completed_at,cycle_number,problems(title)', { count: 'exact' })
    .eq('user_id', userId).in('status', ['done', 'failed'])
  if (params.type) query = query.eq('type', params.type)
  const { data, error, count } = await query.order('completed_at', { ascending: false, nullsFirst: false })
    .order('id', { ascending: false }).range((params.page - 1) * 20, params.page * 20 - 1)
  if (error || count === null) throw new Error('Review history could not be loaded')
  return { reviews: (data ?? []) as unknown as HistoryReview[], total: count, pages: Math.max(1, Math.ceil(count / 20)) }
}

export function historyOutcome(review: Pick<HistoryReview, 'type' | 'status' | 'score'>) {
  if (review.type === 'd4') return 'Explanation completed'
  if (review.status === 'failed') return 'New review cycle started'
  if (review.score === null) return 'Quiz completed · score unavailable'
  return review.score >= 3 ? 'Quiz passed' : 'Quiz completed · keep practicing'
}
