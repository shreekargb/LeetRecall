import { Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { TEST_USER_ID } from '@/lib/constants'
import { getQuestionsForReview } from '@/lib/quiz'
import Quiz from './Quiz'
import ExplainForm from './ExplainForm'

async function ReviewContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: review } = await supabase
    .from('reviews')
    .select('id, type, status, user_id, cycle_number, problem_id, problems(title, link)')
    .eq('id', id)
    .eq('user_id', TEST_USER_ID)
    .single()

  if (!review) return <p>Review not found.</p>
  if (review.status !== 'pending') return <p>This review is already {review.status}.</p>

  const problem = review.problems as unknown as { title: string; link: string | null } | null

  const header = (
    <>
      <h2>{problem?.title} ({review.type})</h2>
      {problem?.link && (
        <p><a href={problem.link} target="_blank" rel="noreferrer">Open problem</a></p>
      )}
    </>
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
    return <p>No questions have been added for this problem yet.</p>
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
      {personalised && <p>These questions are based on your day 4 explanation.</p>}
      <Quiz reviewId={review.id} questions={questions} />
    </>
  )
}

export default function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main>
      <h1>Review</h1>
      <Suspense fallback={<p>Loading...</p>}>
        <ReviewContent params={params} />
      </Suspense>
    </main>
  )
}