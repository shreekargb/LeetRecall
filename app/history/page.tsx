import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { loginPath } from '@/lib/auth-navigation'
import { getReviewHistory, historyHref, historyOutcome, parseHistoryParams, type HistoryParams } from '@/lib/review-history'
import RefreshReviews from '../due/RefreshReviews'

const labels: Record<string, string> = { d1: 'Day 1 quiz', d4: 'Day 4 explanation', d7: 'Day 7 quiz' }
async function History({ searchParams }: { searchParams: Promise<HistoryParams> }) {
  const params = parseHistoryParams(await searchParams)
  const client = await createSupabaseServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) redirect(loginPath(historyHref(params.type, params.page)))
  let history
  try { history = await getReviewHistory(client, user.id, params) } catch {
    return <div role="alert" className="space-y-4 rounded-xl border border-amber-800 p-5 text-amber-200">
      <p>Review history could not be loaded. Please refresh to try again.</p><RefreshReviews />
    </div>
  }
  if (params.page > history.pages) redirect(historyHref(params.type, history.pages))
  return <>
    <form action="/history" method="get" className="mb-6 flex flex-wrap items-end gap-4">
      <label className="text-sm text-gray-300">Review type
        <select key={params.type} name="type" defaultValue={params.type} className="ml-3 rounded-lg border border-gray-700 bg-gray-900 p-3 text-white">
          <option value="">All reviews</option><option value="d1">Day 1 quizzes</option>
          <option value="d4">Day 4 explanations</option><option value="d7">Day 7 quizzes</option>
        </select>
      </label>
      <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500">Apply filter</button>
      <Link href="/history" className="py-3 text-sm text-indigo-300">Clear filter</Link>
    </form>
    <p role="status" className="mb-4 text-sm text-gray-400">{history.total} completed reviews{params.type ? ` · ${labels[params.type]}` : ''}</p>
    {history.total === 0 ? <div className="rounded-xl border border-gray-800 p-6 text-gray-300">
      <p>{params.type ? 'No completed reviews of this type yet.' : 'Your completed quizzes and explanations will appear here.'}</p>
      <Link href="/due" className="mt-3 inline-block text-indigo-300">Go to your reviews →</Link>
    </div> : <ul className="space-y-3">{history.reviews.map(review => <li key={review.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-800 bg-gray-900 p-5">
      <div className="min-w-0 flex-1 break-words">
        <h2 className="font-semibold text-white">{review.problems?.title ?? 'Untitled problem'}</h2>
        <p className="mt-1 text-sm text-gray-400">{labels[review.type] ?? review.type} · Cycle {review.cycle_number}</p>
        <p className="mt-2 text-sm text-gray-200">{historyOutcome(review)}{review.type !== 'd4' && review.score !== null ? ` · ${review.score}/5` : ''}</p>
        <p className="mt-1 text-xs text-gray-400">{review.completed_at ? `Completed ${new Date(review.completed_at).toISOString().slice(0, 10)} (UTC)` : 'Completion date unavailable'}</p>
      </div>
      <Link href={`/review/${review.id}`} aria-label={`View saved ${review.type === 'd4' ? 'explanation' : 'quiz result'} for ${review.problems?.title ?? 'this problem'}`}
        className="rounded-lg bg-gray-800 px-4 py-3 text-sm font-medium text-indigo-200 hover:bg-gray-700">
        {review.type === 'd4' ? 'View explanation' : 'View result'}
      </Link>
    </li>)}</ul>}
    {history.pages > 1 && <nav aria-label="History pages" className="mt-6 flex items-center justify-between gap-4 text-sm">
      {params.page > 1 ? <Link href={historyHref(params.type, params.page - 1)} className="text-indigo-300">← Previous</Link> : <span />}
      <span className="text-gray-400">Page {params.page} of {history.pages}</span>
      {params.page < history.pages ? <Link href={historyHref(params.type, params.page + 1)} className="text-indigo-300">Next →</Link> : <span />}
    </nav>}
  </>
}
export default function HistoryPage({ searchParams }: { searchParams: Promise<HistoryParams> }) {
  return <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
    <Link href="/due" className="text-sm text-indigo-300">← Your reviews</Link>
    <h1 className="mt-4 text-3xl font-bold text-white">Review history</h1>
    <p className="mb-8 mt-2 text-gray-400">Revisit your completed work, newest first. Older reviews may not have saved feedback.</p>
    <Suspense fallback={<p role="status" className="text-gray-400">Loading review history…</p>}><History searchParams={searchParams} /></Suspense>
  </main>
}
