'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import ReviewActions from '@/app/components/ReviewActions'
import { createQuizDraftStore, EMPTY_QUIZ_DRAFT, quizDraftKey } from '@/lib/quiz-drafts'

type Question = { id: number; question: string; options: string[] }
type Result = { id: number; correct_index: number; explanation: string | null; wasCorrect: boolean }
export type Outcome = {
  score: number; total: number; passed: boolean; results: Result[]
  reviewType: 'd1' | 'd7'; restarted: boolean
  answers: Record<number, number>; questions: Question[]
}

export default function Quiz({ reviewId, userId, questions, initialOutcome }: {
  reviewId: number; userId: string; questions: Question[]; initialOutcome?: Outcome
}) {
  const draftKey = quizDraftKey(userId, reviewId)
  const store = useMemo(() => createQuizDraftStore(draftKey, questions, () => window.localStorage), [draftKey, questions])
  const subscribe = useCallback((listener: () => void) => {
    const unsubscribe = store.subscribe(listener)
    const changed = (event: StorageEvent) => { if (event.key === draftKey || event.key === null) store.refresh() }
    window.addEventListener('storage', changed)
    return () => { unsubscribe(); window.removeEventListener('storage', changed) }
  }, [store, draftKey])
  const draft = useSyncExternalStore(subscribe, store.getSnapshot, () => EMPTY_QUIZ_DRAFT)
  const [submittedOutcome, setOutcome] = useState<Outcome | null>(null)
  // A refreshed server result also wins if another tab completed this review.
  const outcome = initialOutcome ?? submittedOutcome
  const answers = outcome?.answers ?? draft.answers
  useEffect(() => { if (outcome) store.clear() }, [outcome, store])
  const submitting = useRef(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const allAnswered = questions.every((q) => answers[q.id] !== undefined)
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length

  async function handleSubmit() {
    if (submitting.current || outcome || !allAnswered) return
    submitting.current = true
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/submit-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, answers }),
        signal: AbortSignal.timeout(15000),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save your quiz. Please retry.')
      setOutcome(data)
    } catch (error) {
      setError(error instanceof Error && error.name === 'Error' ? error.message
        : 'Could not confirm submission. Check your connection and retry; your result will not be duplicated.')
    } finally {
      setLoading(false)
      submitting.current = false
    }
  }

  return (
    <div className="space-y-6">
      {/* Score banner */}
      {outcome && (
        <div role="status" className={`rounded-xl p-5 border ${outcome.passed
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
                  : outcome.restarted
                    ? 'Keep practicing — a new review cycle starts tomorrow.'
                    : 'Day 1 review complete. Study the feedback; your next reviews stay scheduled.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Progress indicator */}
      {!outcome && (
        <div className="space-y-2 text-sm text-gray-400">
          <p>{answeredCount} / {questions.length} answered</p>
          <p role="status" className={draft.storageAvailable ? '' : 'text-amber-300'}>
            {draft.storageAvailable
              ? 'Selections are saved in this browser for this account and review. You can refresh and continue.'
              : 'Browser storage is unavailable. Your selections remain on this page; keep it open until you submit.'}
          </p>
        </div>
      )}

      {/* Questions */}
      {(outcome?.questions ?? questions).map((q, i) => {
        const result = outcome?.results.find((r) => r.id === q.id)
        return (
          <fieldset key={q.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            {/* Question text */}
            <legend className="text-white font-medium px-1">
              <span className="text-gray-500 mr-2">{i + 1}.</span>
              {q.question}
            </legend>

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
                      disabled={!!outcome || loading}
                      onChange={() => store.choose(q.id, index)}
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
          </fieldset>
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
          {error && <p role="alert" className="mt-3 text-red-400 text-sm text-center">{error}</p>}
        </div>
      ) : (
        <ReviewActions />
      )}
    </div>
  )
}
