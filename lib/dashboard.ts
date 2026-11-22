import type { SupabaseClient } from '@supabase/supabase-js'

// Counts are separate so a failed query never masquerades as zero progress.
export async function getDashboardCounts(client: SupabaseClient, userId: string) {
  const requests = [
    client.from('problems').select('id', { count: 'exact', head: true }),
    client.from('user_problems').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    client.from('reviews').select('id', { count: 'exact', head: true }).eq('user_id', userId).in('status', ['done', 'failed']),
  ]
  const values = (await Promise.allSettled(requests)).map(result =>
    result.status === 'fulfilled' && !result.value.error ? result.value.count ?? null : null)
  return { totalProblems: values[0], solvedProblems: values[1], completedReviews: values[2] }
}
