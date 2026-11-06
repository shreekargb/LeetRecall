import { Suspense } from 'react'
import Link from 'next/link'
import { getDueReviews } from '@/lib/reviews'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

const TYPE_STYLES: Record<string, { badge: string; label: string; button: string }> = {
  d1: {
    badge: 'bg-blue-900/50 text-blue-300 border-blue-800',
    label: 'Day 1',
    button: 'bg-blue-600 hover:bg-blue-500',
  },
  d4: {
    badge: 'bg-orange-900/50 text-orange-300 border-orange-800',
    label: 'Day 4',
    button: 'bg-orange-600 hover:bg-orange-500',
  },
  d7: {
    badge: 'bg-red-900/50 text-red-300 border-red-800',
    label: 'Day 7',
    button: 'bg-red-600 hover:bg-red-500',
  },
}

async function DueList() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const reviews = await getDueReviews(user.id)

  if (reviews.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-semibold text-white mb-2">All caught up!</h2>
        <p className="text-gray-400">Nothing due today. Come back tomorrow.</p>
        <Link
          href="/patterns"
          className="inline-block mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
        >
          Solve new problems →
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => {
        const style = TYPE_STYLES[review.type] ?? TYPE_STYLES.d1
        const isD4 = review.type === 'd4'
        return (
          <div
            key={review.id}
            className="flex items-center gap-4 bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl px-5 py-4 transition-colors"
          >
            {/* Type badge */}
            <span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${style.badge}`}>
              {style.label}
            </span>

            {/* Problem info */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">
                {review.problems?.title ?? 'Unknown problem'}
              </p>
              <p className="text-gray-500 text-xs mt-0.5">Due {review.due_date}</p>
            </div>

            {/* CTA */}
            <Link
              href={`/review/${review.id}`}
              className={`shrink-0 inline-flex items-center gap-1.5 ${style.button} text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors`}
            >
              {isD4 ? 'Write Explanation' : 'Start Quiz'}
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )
      })}
    </div>
  )
}

function DueListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 animate-pulse">
          <div className="h-6 w-14 bg-gray-800 rounded-full" />
          <div className="flex-1">
            <div className="h-4 bg-gray-800 rounded w-2/3 mb-2" />
            <div className="h-3 bg-gray-800 rounded w-1/4" />
          </div>
          <div className="h-8 w-24 bg-gray-800 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

export default function DuePage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Due Today</h1>
        <p className="text-gray-400 mt-2">Complete your scheduled reviews to stay on track.</p>
      </div>
      <Suspense fallback={<DueListSkeleton />}>
        <DueList />
      </Suspense>
    </main>
  )
}
