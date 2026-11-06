import { Suspense } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { TEST_USER_ID } from '@/lib/constants'
import { getQuestionsForReview } from '@/lib/quiz'
import Quiz from './Quiz'
import ExplainForm from './ExplainForm'

const TYPE_LABELS: Record<string, string> = { d1: 'Day 1', d4: 'Day 4', d7: 'Day 7' }
const TYPE_BADGE: Record<string, string> = {
  d1: 'bg-blue-900/50 text-blue-300 border-blue-800',
  d4: 'bg-orange-900/50 text-orange-300 border-orange-800',
  d7: 'bg-red-900/50 text-red-300 border-red-800',
}

async function ReviewContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: review } = await supabase
    .from('reviews')
    .select('id, type, status, user_id, cycle_number, problem_id, problems(title, link)')
    .eq('id', id)
    .eq('user_id', TEST_USER_ID)
    .single()

  if (!review) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Review not found.</p>
        <Link href="/due" className="mt-4 inline-block text-indigo-400 hover:text-indigo-300 text-sm">
          ← Back to due reviews
        </Link>
      </div>
    )
  }

  if (review.status !== 'pending') {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">✅</div>
        <p className="text-gray-300 text-lg font-medium">
          This review is already <span className="text-green-400">{review.status}</span>.
        </p>
        <Link href="/due" className="mt-4 inline-block text-indigo-400 hover:text-indigo-300 text-sm">
          ← Back to due reviews
        </Link>
      </div>
    )
  }

  const problem = review.problems as unknown as { title: string; link: string | null } | null
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

  if (review.type === 'd4') {
    return (
      <>
        {header}
        <ExplainForm reviewId={review.id} />
      </>
    )
  }

  const allQuestions = await getQuestionsForReview(review)

  if (allQuestions.length === 0) {
    return (
      <>
        {header}
        <div className="bg-yellow-900/20 border border-yellow-800 rounded-xl p-5 text-yellow-300">
          No questions have been added for this problem yet.
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
      <Quiz reviewId={review.id} questions={questions} />
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
