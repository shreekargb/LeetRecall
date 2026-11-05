import { Suspense } from 'react'
import Link from 'next/link'
import { getDueReviews } from '@/lib/reviews'

async function DueList() {
  const reviews = await getDueReviews()

  if (reviews.length === 0) {
    return <p>Nothing due today.</p>
  }

  return (
    <div>
      {reviews.map((review) => (
        <div key={review.id}>
          {review.problems?.title} — {review.type} (due {review.due_date}){' '}
          <Link href={`/review/${review.id}`}>
            {review.type === 'd4' ? 'Explain it' : 'Start quiz'}
          </Link>
        </div>
      ))}
    </div>
  )
}

export default function DuePage() {
  return (
    <main>
      <h1>Due today</h1>
      <Suspense fallback={<p>Loading reviews...</p>}>
        <DueList />
      </Suspense>
    </main>
  )
}