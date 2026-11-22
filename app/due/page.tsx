import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getReviewQueue, REVIEW_PAGE_SIZE, type DueReview } from '@/lib/reviews'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import RefreshReviews from './RefreshReviews'
import { loginPath } from '@/lib/auth-navigation'

type SearchParams = Promise<{ page?: string | string[] }>
const LABELS: Record<string, string> = { d1: 'Day 1 quiz', d4: 'Day 4 explanation', d7: 'Day 7 quiz' }

function ReviewCard({ review, today, upcoming = false }: {
  review: DueReview; today: string; upcoming?: boolean
}) {
  const overdue = review.due_date < today
  return (
    <li className="flex flex-col gap-4 rounded-xl border border-gray-800 bg-gray-900 p-5 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-indigo-800 bg-indigo-900/30 px-2.5 py-1 text-indigo-200">
            {LABELS[review.type] ?? 'Review'}
          </span>
          {overdue && <span className="font-medium text-amber-300">Overdue</span>}
        </div>
        <p className="font-medium text-gray-100 break-words">{review.problems?.title ?? 'Untitled problem'}</p>
        <p className="mt-1 text-sm text-gray-400">
          {upcoming ? 'Opens' : overdue ? 'Originally due' : 'Due today:'} {review.due_date}
        </p>
      </div>
      {upcoming ? (
        <span className="text-sm text-gray-400">Scheduled</span>
      ) : (
        <Link href={`/review/${review.id}`}
          aria-label={`${review.type === 'd4' ? 'Write explanation for' : 'Start quiz for'} ${review.problems?.title ?? 'this problem'}`}
          className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-indigo-300">
          {review.type === 'd4' ? 'Write explanation' : 'Start quiz'}
        </Link>
      )}
    </li>
  )
}

async function ReviewSchedule({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const params = await searchParams
  const page = typeof params.page === 'string' && /^[1-9]\d{0,5}$/.test(params.page) ? Number(params.page) : 1
  if (!user) redirect(loginPath(page === 1 ? '/due' : `/due?page=${page}`))
  let queue
  try {
    queue = await getReviewQueue(supabase, user.id, page)
  } catch {
    return (
      <div role="alert" className="space-y-4 rounded-xl border border-amber-800 bg-amber-900/10 p-6">
        <h2 className="font-semibold text-amber-200">Your schedule could not be loaded</h2>
        <p className="text-sm text-gray-300">Your progress has not been changed. Try refreshing in a moment.</p>
        <RefreshReviews />
      </div>
    )
  }
  const totalPages = Math.max(1, Math.ceil(queue.dueCount / REVIEW_PAGE_SIZE))
  if (page > totalPages) redirect(totalPages === 1 ? '/due' : `/due?page=${totalPages}`)
  const overdue = queue.due.filter(r => r.due_date < queue.today)
  const today = queue.due.filter(r => r.due_date === queue.today)
  const noSchedule = queue.dueCount === 0 && queue.upcomingCount === 0

  return (
    <div className="space-y-8">
      <dl className="grid grid-cols-3 gap-3">
        {[
          ['Overdue', queue.overdueCount],
          ['Due today', Math.max(0, queue.dueCount - queue.overdueCount)],
          ['Upcoming', queue.upcomingCount],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-center">
            <dt className="text-xs sm:text-sm text-gray-400">{label}</dt>
            <dd className="mt-1 text-2xl font-bold text-white">{value}</dd>
          </div>
        ))}
      </dl>

      {queue.dueCount > 0 ? (
        <>
          <section className="rounded-xl border border-indigo-800 bg-indigo-900/20 p-5">
            <h2 className="text-lg font-semibold text-white">{queue.overdueCount > 0 ? 'Pick up where you left off' : 'Ready for today’s review?'}</h2>
            <p className="mt-2 text-sm text-gray-300">
              {queue.overdueCount > 0
                ? 'Your overdue reviews are still available. Complete them at your own pace; opening this page does not restart your schedule.'
                : 'Complete a review to strengthen what you have learned.'}
            </p>
            {page === 1 && queue.due[0] && (
              <Link href={`/review/${queue.due[0].id}`}
                className="mt-4 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500">
                {queue.overdueCount > 0 ? 'Start oldest review' : 'Start review'}
              </Link>
            )}
          </section>
          {[
            { title: 'Overdue reviews', rows: overdue },
            { title: 'Due today', rows: today },
          ].map(group => group.rows.length > 0 && (
            <section key={group.title} aria-label={group.title}>
              <h2 className="mb-4 text-lg font-semibold text-white">{group.title}</h2>
              <ul className="space-y-3">{group.rows.map(r => <ReviewCard key={r.id} review={r} today={queue.today} />)}</ul>
            </section>
          ))}
          <nav aria-label="Review pages" className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="text-gray-400">Showing {(page - 1) * REVIEW_PAGE_SIZE + 1}–{Math.min(page * REVIEW_PAGE_SIZE, queue.dueCount)} of {queue.dueCount} due reviews</p>
            <div className="flex items-center gap-4">
              {page > 1 && <Link href={page === 2 ? '/due' : `/due?page=${page - 1}`} className="text-indigo-300 underline">Previous</Link>}
              {page < totalPages && <Link href={`/due?page=${page + 1}`} className="text-indigo-300 underline">Next</Link>}
            </div>
          </nav>
        </>
      ) : (
        <section className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
          <h2 className="text-xl font-semibold text-white">{noSchedule ? 'No reviews scheduled' : 'You’re caught up for today'}</h2>
          <p className="mt-2 text-gray-400">
            {noSchedule ? 'Mark a problem solved to schedule your Day 1, Day 4 and Day 7 reviews.'
              : `Your next review opens on ${queue.upcoming[0]?.due_date}.`}
          </p>
          <Link href="/patterns" className="mt-5 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500">Browse problems</Link>
        </section>
      )}

      {queue.upcoming.length > 0 && (
        <section aria-label="Upcoming reviews">
          <h2 className="text-lg font-semibold text-white">Coming up</h2>
          <p className="mb-4 mt-1 text-sm text-gray-400">Next {queue.upcoming.length} of {queue.upcomingCount} scheduled reviews. They open on their due dates.</p>
          <ul className="space-y-3">{queue.upcoming.map(r => <ReviewCard key={r.id} review={r} today={queue.today} upcoming />)}</ul>
        </section>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-400">Schedule dates use UTC. Today: {queue.today}.</p>
        <RefreshReviews />
      </div>
    </div>
  )
}

function ScheduleSkeleton() {
  return <div role="status" aria-label="Loading review schedule" className="space-y-3 animate-pulse">
    {[0, 1, 2].map(i => <div key={i} className="h-24 rounded-xl border border-gray-800 bg-gray-900" />)}
  </div>
}

export default function DuePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Your reviews</h1>
        <p className="mt-2 text-gray-400">See what needs attention and what is coming next.</p>
        <Link href="/history" className="mt-3 inline-block text-sm text-indigo-300 hover:underline">View completed reviews →</Link>
      </div>
      <Suspense fallback={<ScheduleSkeleton />}><ReviewSchedule searchParams={searchParams} /></Suspense>
    </main>
  )
}
