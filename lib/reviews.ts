import type { SupabaseClient } from '@supabase/supabase-js'

export const REVIEW_PAGE_SIZE = 20
export const UPCOMING_PREVIEW_SIZE = 5

export type DueReview = {
  id: number
  type: string
  due_date: string
  problem_id: number
  problems: { title: string; link: string | null } | null
}

export type ReviewQueue = {
  today: string
  due: DueReview[]
  upcoming: DueReview[]
  dueCount: number
  overdueCount: number
  upcomingCount: number
}

// A page read must never expire reviews or create new cycles.
export async function getReviewQueue(
  supabase: SupabaseClient, userId: string, page = 1, now = new Date()
): Promise<ReviewQueue> {
  if (!Number.isInteger(page) || page < 1 || page > 1000000) throw new Error('Invalid review page')
  const today = now.toISOString().slice(0, 10)
  const columns = 'id, type, due_date, problem_id, problems(title, link)'
  const [due, upcoming, overdue] = await Promise.all([
    supabase.from('reviews').select(columns, { count: 'exact' })
      .eq('user_id', userId).eq('status', 'pending').lte('due_date', today)
      .order('due_date').order('id')
      .range((page - 1) * REVIEW_PAGE_SIZE, page * REVIEW_PAGE_SIZE - 1),
    supabase.from('reviews').select(columns, { count: 'exact' })
      .eq('user_id', userId).eq('status', 'pending').gt('due_date', today)
      .order('due_date').order('id').limit(UPCOMING_PREVIEW_SIZE),
    supabase.from('reviews').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('status', 'pending').lt('due_date', today),
  ])
  if (due.error || upcoming.error || overdue.error) throw new Error('Unable to load review schedule')
  return {
    today, due: (due.data ?? []) as unknown as DueReview[],
    upcoming: (upcoming.data ?? []) as unknown as DueReview[],
    dueCount: due.count ?? 0, overdueCount: overdue.count ?? 0,
    upcomingCount: upcoming.count ?? 0,
  }
}
