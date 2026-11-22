import Link from 'next/link'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getDashboardCounts } from '@/lib/dashboard'
import { getReviewQueue } from '@/lib/reviews'
import RefreshReviews from '../due/RefreshReviews'

const labels: Record<string, string> = { d1: 'Day 1 quiz', d4: 'Day 4 explanation', d7: 'Day 7 quiz' }
export default async function StudyDashboard({ client, userId }: { client: SupabaseClient; userId: string }) {
  const [counts, schedule] = await Promise.all([
    getDashboardCounts(client, userId),
    getReviewQueue(client, userId).then(value => ({ value })).catch(() => ({ value: null })),
  ])
  const queue = schedule.value
  const next = queue?.due[0]
  const upcoming = queue?.upcoming[0]
  return <div className="space-y-8">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-3xl font-bold text-white">Your study dashboard</h1>
        <p className="mt-2 text-gray-400">Pick up where you left off, one review at a time.</p></div>
      <RefreshReviews />
    </header>
    <section aria-label="Study progress" className="grid gap-4 sm:grid-cols-3">
      {[
        { label: 'Problems solved', value: counts.solvedProblems, note: counts.totalProblems === null ? 'Catalogue total unavailable' : `of ${counts.totalProblems} in the catalogue` },
        { label: 'Reviews completed', value: counts.completedReviews, note: 'Includes quizzes that started a new cycle' },
        { label: 'Reviews ready', value: queue?.dueCount ?? null, note: queue ? `${queue.overdueCount} overdue · ${queue.dueCount - queue.overdueCount} due today` : 'Schedule unavailable' },
      ].map(stat => <div key={stat.label} className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-sm text-gray-300">{stat.label}</h2>
        <p className="mt-2 text-3xl font-bold text-indigo-300">{stat.value ?? 'Unavailable'}</p>
        <p className="mt-2 text-xs text-gray-400">{stat.note}</p>
      </div>)}
    </section>
    {(counts.solvedProblems === null || counts.completedReviews === null || counts.totalProblems === null) &&
      <p role="alert" className="text-amber-200">Some progress totals could not be loaded. Refresh to retry.</p>}
    <section aria-labelledby="next-step" className="rounded-2xl border border-indigo-800 bg-indigo-950/30 p-6">
      <h2 id="next-step" className="text-xl font-semibold text-white">Your next step</h2>
      {!queue ? <>
        <p role="alert" className="mt-3 text-amber-200">Your schedule could not be loaded. Refresh or open your reviews to retry.</p>
        <Link href="/due" className="mt-4 inline-block text-indigo-300">Open reviews →</Link>
      </> : next ? <>
        <p className="mt-3 text-lg text-gray-100">{next.problems?.title ?? 'Untitled problem'}</p>
        <p className="mt-1 text-sm text-gray-400">{labels[next.type] ?? next.type} · Due {next.due_date} (UTC)</p>
        <Link href={`/review/${next.id}`} className="mt-5 inline-block rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-500">
          {next.type === 'd4' ? 'Continue with an explanation' : 'Start next quiz'}
        </Link>
      </> : <>
        <p className="mt-3 text-gray-200">{counts.solvedProblems === 0 ? 'Solve your first problem to start your review schedule.' : 'No reviews are waiting today.'}</p>
        {upcoming && <p className="mt-2 text-sm text-gray-400">Next review: {upcoming.problems?.title ?? 'Untitled problem'} on {upcoming.due_date} (UTC).</p>}
        <Link href="/problems?status=unsolved" className="mt-5 inline-block rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-500">Find a problem to solve</Link>
      </>}
    </section>
    {queue && queue.upcoming.length > 0 && <section aria-labelledby="upcoming-heading">
      <h2 id="upcoming-heading" className="mb-4 text-xl font-semibold text-white">Coming up</h2>
      <ul className="space-y-3">{queue.upcoming.slice(0, 3).map(review => <li key={review.id} className="rounded-xl border border-gray-800 p-4">
        <p className="font-medium text-gray-200">{review.problems?.title ?? 'Untitled problem'}</p>
        <p className="mt-1 text-sm text-gray-400">{labels[review.type] ?? review.type} · Opens {review.due_date} (UTC)</p>
      </li>)}</ul>
      <p className="mt-3 text-sm text-gray-400">{queue.upcomingCount} upcoming reviews in total.</p>
    </section>}
    <nav aria-label="Study shortcuts" className="flex flex-wrap gap-4 text-indigo-300">
      <Link href="/due" className="hover:underline">All reviews →</Link>
      <Link href="/history" className="hover:underline">Review history →</Link>
      <Link href="/problems" className="hover:underline">Search problems →</Link>
      <Link href="/patterns" className="hover:underline">Browse patterns →</Link>
    </nav>
  </div>
}
