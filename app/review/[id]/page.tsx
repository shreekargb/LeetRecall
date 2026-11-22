import { Suspense } from 'react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getQuestionsForReview } from '@/lib/quiz'
import Quiz, { type Outcome } from './Quiz'
import ExplainForm from './ExplainForm'
import { getSavedExplanation } from '@/lib/explanations'
import { loginPath } from '@/lib/auth-navigation'
import { isValidRouteId } from '@/lib/route-id'

const TYPE_LABELS: Record<string, string> = { d1: 'Day 1', d4: 'Day 4', d7: 'Day 7' }
const TYPE_BADGE: Record<string, string> = {
  d1: 'bg-blue-900/50 text-blue-300 border-blue-800',
  d4: 'bg-orange-900/50 text-orange-300 border-orange-800',
  d7: 'bg-red-900/50 text-red-300 border-red-800',
}

async function ReviewContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isValidRouteId(id)) notFound()

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(loginPath(`/review/${id}`))

  const { data: review, error: reviewError } = await supabase
    .from('reviews')
    .select('id, type, status, due_date, user_id, cycle_number, problem_id, problems(title, link)')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (reviewError) throw new Error('Review could not be loaded')
  if (!review) notFound()

  const problem = review.problems as unknown as { title: string; link: string | null } | null
  if (review.status !== 'pending') {
    if (review.type === 'd4') {
      let saved
      let loadFailed = false
      try {
        saved = await getSavedExplanation(supabase, user.id, review.id)
      } catch { loadFailed = true }
      if (loadFailed) return <p role="alert" className="text-amber-300">Your saved explanation could not be loaded. Refresh to try again.</p>
      if (saved) return <>
          <h1 className="mb-6 text-2xl font-bold">{problem?.title}</h1>
          <ExplainForm key={`${user.id}-${review.id}`} reviewId={review.id} userId={user.id} initialSaved={saved} />
        </>
    }
    const { data: attempt, error } = await supabase.from('quiz_attempts').select('outcome')
      .eq('review_id', review.id).eq('user_id', user.id).maybeSingle()
    if (attempt) {
      const outcome = attempt.outcome as Outcome
      return (
        <>
          <h1 className="text-2xl font-bold mb-2">{problem?.title}</h1>
          <p className="text-gray-400 mb-6">Saved {TYPE_LABELS[review.type]} quiz result</p>
          <Quiz key={`${user.id}-${review.id}`} userId={user.id} reviewId={review.id} questions={outcome.questions} initialOutcome={outcome} />
        </>
      )
    }
    return (
      <div className="text-center py-20">
        <p className="text-gray-300 text-lg font-medium">
          This review is already {review.status}.
        </p>
        {error && <p role="alert" className="text-amber-300 mt-2">Saved feedback could not be loaded. Please refresh to retry.</p>}
        <Link href="/due" className="mt-4 inline-block text-indigo-400 hover:text-indigo-300 text-sm">
          ← Back to due reviews
        </Link>
      </div>
    )
  }

  const badgeStyle = TYPE_BADGE[review.type] ?? TYPE_BADGE.d1

  const header = (
    <div className="mb-8">
      <Link href="/due" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-4">
        ← Back to due reviews
      </Link>
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-white">{problem?.title}</h1>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeStyle}`}>
          {TYPE_LABELS[review.type] ?? review.type}
        </span>
      </div>
      {problem?.link && (
        <a
          href={problem.link}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 mt-3 text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
        >
          Open problem
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      )}
    </div>
  )

  if (review.due_date > new Date().toISOString().slice(0, 10)) {
    return <>{header}<p className="text-gray-300">This review opens on {review.due_date} (UTC). Come back then.</p></>
  }

  if (review.type === 'd4') {
    return (
      <>
        {header}
        <ExplainForm key={`${user.id}-${review.id}`} reviewId={review.id} userId={user.id} />
      </>
    )
  }

  let allQuestions
  try {
    allQuestions = await getQuestionsForReview(supabase, review)
  } catch {
    return <>{header}<p role="alert" className="text-amber-300">Questions could not be loaded. Refresh to try again.</p></>
  }

  if (allQuestions.length !== 5) {
    return (
      <>
        {header}
        <div className="bg-yellow-900/20 border border-yellow-800 rounded-xl p-5 text-yellow-300">
          This quiz is not ready yet. Please try again later.
        </div>
      </>
    )
  }

  const questions = allQuestions.map((q) => ({
    id: q.id,
    question: q.question,
    options: q.options,
  }))
  const personalised = review.type === 'd7' && allQuestions[0].source === 'ai'

  return (
    <>
      {header}
      {personalised && (
        <div className="mb-6 bg-indigo-900/20 border border-indigo-800 rounded-xl p-4 text-indigo-300 text-sm">
          ✨ These questions are personalised based on your Day 4 explanation.
        </div>
      )}
      <Quiz key={`${user.id}-${review.id}`} userId={user.id} reviewId={review.id} questions={questions} />
    </>
  )
}

function ReviewSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-800 rounded w-32 mb-6" />
      <div className="h-7 bg-gray-800 rounded w-2/3 mb-8" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="h-4 bg-gray-800 rounded w-3/4 mb-4" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-10 bg-gray-800 rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Suspense fallback={<ReviewSkeleton />}>
        <ReviewContent params={params} />
      </Suspense>
    </main>
  )
}
