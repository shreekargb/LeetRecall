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
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length

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
    <div className="space-y-6">
      {/* Score banner */}
      {outcome && (
        <div className={`rounded-xl p-5 border ${outcome.passed
          ? 'bg-green-900/20 border-green-700'
          : 'bg-red-900/20 border-red-700'}`}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">{outcome.passed ? '🎉' : '😔'}</span>
            <div>
              <p className="text-white font-bold text-lg">
                Score: {outcome.score} / {outcome.total}
              </p>
              <p className={`text-sm font-medium ${outcome.passed ? 'text-green-400' : 'text-red-400'}`}>
                {outcome.passed
                  ? '✓ Passed — well done!'
                  : '✗ Not passed — this problem restarts from Day 1.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Progress indicator */}
      {!outcome && (
        <p className="text-sm text-gray-500">
          {answeredCount} / {questions.length} answered
        </p>
      )}

      {/* Questions */}
      {questions.map((q, i) => {
        const result = outcome?.results.find((r) => r.id === q.id)
        return (
          <div key={q.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            {/* Question text */}
            <p className="text-white font-medium mb-4">
              <span className="text-gray-500 mr-2">{i + 1}.</span>
              {q.question}
            </p>

            {/* Options */}
            <div className="space-y-2">
              {q.options.map((option, index) => {
                const isSelected = answers[q.id] === index
                const isCorrect = result?.correct_index === index
                const isWrong = result && isSelected && !result.wasCorrect

                let optionStyle = 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600 hover:bg-gray-800'
                if (!outcome && isSelected) {
                  optionStyle = 'border-indigo-500 bg-indigo-900/30 text-white'
                } else if (outcome && isCorrect) {
                  optionStyle = 'border-green-500 bg-green-900/20 text-green-300'
                } else if (outcome && isWrong) {
                  optionStyle = 'border-red-500 bg-red-900/20 text-red-300'
                } else if (outcome) {
                  optionStyle = 'border-gray-800 bg-gray-900 text-gray-500'
                }

                return (
                  <label
                    key={index}
                    className={`flex items-center gap-3 w-full text-left border rounded-lg px-4 py-3 text-sm cursor-pointer transition-all ${optionStyle} ${outcome ? 'cursor-default' : ''}`}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      checked={isSelected}
                      disabled={!!outcome}
                      onChange={() => setAnswers({ ...answers, [q.id]: index })}
                      className="accent-indigo-500 shrink-0"
                    />
                    <span className="flex-1">{option}</span>
                    {outcome && isCorrect && <span className="text-green-400 font-bold shrink-0">✓</span>}
                    {outcome && isWrong && <span className="text-red-400 font-bold shrink-0">✗</span>}
                  </label>
                )
              })}
            </div>

            {/* Explanation after submit */}
            {result && (
              <div className={`mt-4 p-3 rounded-lg text-sm border ${result.wasCorrect
                ? 'bg-green-900/10 border-green-800/50 text-green-300'
                : 'bg-red-900/10 border-red-800/50 text-red-300'}`}
              >
                <span className="font-semibold">{result.wasCorrect ? 'Correct. ' : 'Wrong. '}</span>
                {result.explanation}
              </div>
            )}
          </div>
        )
      })}

      {/* Submit / Back */}
      {!outcome ? (
        <div>
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-semibold py-3 rounded-xl transition-colors text-sm cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2 justify-center">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Checking...
              </span>
            ) : (
              `Submit answers${!allAnswered ? ` (${answeredCount}/${questions.length})` : ''}`
            )}
          </button>
          {error && <p className="mt-3 text-red-400 text-sm text-center">{error}</p>}
        </div>
      ) : (
        <Link
          href="/due"
          className="block text-center bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold py-3 rounded-xl transition-colors text-sm"
        >
          ← Back to due reviews
        </Link>
      )}
    </div>
  )
}
