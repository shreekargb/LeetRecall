import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getReviewQueue } from '@/lib/reviews'
import { loginPath } from '@/lib/auth-navigation'
import RefreshReviews from '@/app/due/RefreshReviews'

async function NextReview() {
  const client = await createSupabaseServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) redirect(loginPath('/review/next'))
  let queue
  try { queue = await getReviewQueue(client, user.id) } catch {
    return <div className="space-y-4 rounded-xl border border-amber-800 p-6">
      <h1 className="text-xl font-semibold text-white">Could not load your next review</h1>
      <p role="alert" className="text-amber-200">Your saved work is safe. Refresh to check your schedule again.</p>
      <RefreshReviews /><Link href="/due" className="block text-indigo-300">Back to reviews</Link>
    </div>
  }
  const next = queue.due[0]
  if (next) redirect(`/review/${next.id}`)
  const upcoming = queue.upcoming[0]
  return <section className="space-y-5 rounded-2xl border border-green-800 bg-green-950/20 p-6 sm:p-8">
    <h1 className="text-2xl font-bold text-white">You’re caught up for now</h1>
    <p className="text-gray-300">No pending reviews are due as of {queue.today} (UTC).</p>
    {upcoming ? <p className="text-gray-300">Next scheduled review: <span className="font-medium text-white">{upcoming.problems?.title ?? 'Untitled problem'}</span> on {upcoming.due_date} (UTC).</p>
      : <p className="text-gray-300">Solve another problem whenever you’re ready to add to your review schedule.</p>}
    <nav aria-label="Continue studying" className="flex flex-wrap gap-4 text-indigo-300">
      <Link href="/">Back to dashboard</Link><Link href="/history">View saved work</Link>
      <Link href="/problems?status=unsolved">Find a problem</Link>
    </nav>
  </section>
}

export default function NextReviewPage() {
  return <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
    <Suspense fallback={<p role="status" className="text-gray-400">Finding your next due review…</p>}>
      <NextReview />
    </Suspense>
  </main>
}
