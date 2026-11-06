'use client'

import { useState } from 'react'
import Link from 'next/link'

const MIN_LENGTH = 30

export default function ExplainForm({ reviewId }: { reviewId: number }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [gaps, setGaps] = useState<string[] | null>(null)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/submit-explanation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, text }),
      })
      const data = await res.json()

      if (res.ok) {
        setGaps(data.gaps ?? null)
        setDone(true)
      } else {
        setError(data.error)
      }
    } catch {
      setError('Request failed. Check the server terminal for the error.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="space-y-5">
        {/* Success banner */}
        <div className="bg-green-900/20 border border-green-700 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="text-white font-semibold">Explanation saved!</p>
              <p className="text-green-400 text-sm">Your Day 7 quiz has been scheduled.</p>
            </div>
          </div>
        </div>

        {/* AI Feedback */}
        {gaps === null && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-gray-400 text-sm">
            AI feedback is unavailable for this problem right now.
          </div>
        )}

        {gaps !== null && gaps.length === 0 && (
          <div className="bg-green-900/10 border border-green-800 rounded-xl p-5">
            <p className="text-green-400 font-semibold flex items-center gap-2">
              <span>🎯</span> No major gaps found. Nice work!
            </p>
          </div>
        )}

        {gaps !== null && gaps.length > 0 && (
          <div className="bg-orange-900/10 border border-orange-800 rounded-xl p-5">
            <p className="text-orange-300 font-semibold mb-3 flex items-center gap-2">
              <span>🔍</span> AI identified {gaps.length} gap{gaps.length > 1 ? 's' : ''} to work on:
            </p>
            <ul className="space-y-2">
              {gaps.map((gap, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-orange-200">
                  <span className="text-orange-400 font-bold shrink-0 mt-0.5">{i + 1}.</span>
                  {gap}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Link
          href="/due"
          className="block text-center bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold py-3 rounded-xl transition-colors text-sm"
        >
          ← Back to due reviews
        </Link>
      </div>
    )
  }

  const charCount = text.trim().length
  const isReady = charCount >= MIN_LENGTH
  const progressPct = Math.min((charCount / MIN_LENGTH) * 100, 100)

  return (
    <div className="space-y-5">
      {/* Instructions */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <p className="text-gray-300 text-sm leading-relaxed">
          Explain the approach in your own words: <span className="text-white font-medium">which technique</span>,{' '}
          <span className="text-white font-medium">why it works</span>, and the{' '}
          <span className="text-white font-medium">key steps</span>.
          AI will evaluate your explanation and generate personalised quiz questions for Day 7.
        </p>
      </div>

      {/* Textarea */}
      <div>
        <textarea
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Start typing your explanation here..."
          className="w-full bg-gray-900 border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-600 text-sm resize-none outline-none transition-colors"
        />

        {/* Character counter + progress */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex-1 mr-4">
            <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${isReady ? 'bg-green-500' : 'bg-indigo-500'}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <span className={`text-xs font-medium ${isReady ? 'text-green-400' : 'text-gray-500'}`}>
            {charCount} / {MIN_LENGTH} min
          </span>
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!isReady || loading}
        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-semibold py-3 rounded-xl transition-colors text-sm cursor-pointer disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="inline-flex items-center gap-2 justify-center">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            AI is evaluating your explanation...
          </span>
        ) : (
          'Submit explanation'
        )}
      </button>

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
