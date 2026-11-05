'use client'

import { useState } from 'react'
import Link from 'next/link'

type Question = { id: number; question: string; options: string[] }
type Result = { id: number; correct_index: number; explanation: string | null; wasCorrect: boolean }
type Outcome = { score: number; total: number; passed: boolean; results: Result[] }

export default function Quiz({ reviewId, questions }: { reviewId: number; questions: Question[] }) {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const allAnswered = questions.every((q) => answers[q.id] !== undefined)

  async function handleSubmit() {
    setLoading(true)
    setError('')

    const res = await fetch('/api/submit-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewId, answers }),
    })
    const data = await res.json()

    if (res.ok) {
      setOutcome(data)
    } else {
      setError(data.error)
    }
    setLoading(false)
  }

  return (
    <div>
      {outcome && (
        <p>
          <strong>Score: {outcome.score} / {outcome.total}</strong>{' '}
          {outcome.passed ? '✓ Passed' : '✗ Not passed. This problem restarts from day 1.'}
        </p>
      )}

      {questions.map((q, i) => {
        const result = outcome?.results.find((r) => r.id === q.id)
        return (
          <div key={q.id}>
            <p>{i + 1}. {q.question}</p>
            {q.options.map((option, index) => (
              <label key={index} style={{ display: 'block' }}>
                <input
                  type="radio"
                  name={`q-${q.id}`}
                  checked={answers[q.id] === index}
                  disabled={!!outcome}
                  onChange={() => setAnswers({ ...answers, [q.id]: index })}
                />{' '}
                {option}
                {result && result.correct_index === index && ' ✓'}
              </label>
            ))}
            {result && (
              <p>{result.wasCorrect ? 'Correct.' : 'Wrong.'} {result.explanation}</p>
            )}
          </div>
        )
      })}

      {!outcome && (
        <button onClick={handleSubmit} disabled={!allAnswered || loading}>
          {loading ? 'Checking...' : 'Submit answers'}
        </button>
      )}
      {error && <p>{error}</p>}
      {outcome && <Link href="/due">Back to due reviews</Link>}
    </div>
  )
}