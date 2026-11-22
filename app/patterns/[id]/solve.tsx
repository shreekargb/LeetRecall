'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SolveButton({ problemId, initiallySolved, progressUnavailable }: {
  problemId: number
  initiallySolved: boolean
  progressUnavailable: boolean
}) {
  const router = useRouter()
  const saving = useRef(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleClick() {
    if (saving.current || initiallySolved || progressUnavailable) return
    saving.current = true
    setStatus('loading')
    setMessage('')
    try {
      const res = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId }),
        signal: AbortSignal.timeout(15000),
      })
      const data = await res.json()
      if (!res.ok || data.success !== true) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Could not save your progress. Please try again.')
      }
      setStatus('done')
      setMessage(data.nextReviewDate ? `Next review: ${data.nextReviewDate} (UTC)` : 'Progress saved')
      router.refresh()
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error && error.name === 'Error'
        ? error.message
        : 'Could not confirm saving. Check your connection and retry; your progress will not be duplicated.')
    } finally {
      saving.current = false
    }
  }

  if (initiallySolved || status === 'done') {
    return (
      <span role="status" className="inline-flex flex-col gap-1 text-green-400 text-sm font-medium shrink-0">
        <span className="inline-flex items-center gap-1.5">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Solved
        </span>
        {status === 'done' && message && <span className="text-xs text-gray-400">{message}</span>}
      </span>
    )
  }

  return (
    <div className="shrink-0">
      <button
        onClick={handleClick}
        disabled={status === 'loading' || progressUnavailable}
        className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 disabled:text-indigo-400 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
      >
        {status === 'loading' ? (
          <>
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Saving...
          </>
        ) : (
          progressUnavailable ? 'Progress unavailable' : status === 'error' ? 'Retry saving' : 'Mark Solved'
        )}
      </button>
      {status === 'error' && (
        <p role="alert" className="text-red-400 text-xs mt-1 max-w-56">{message}</p>
      )}
    </div>
  )
}
