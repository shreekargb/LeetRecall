'use client'

import { useState } from 'react'

export default function SolveButton({ problemId }: { problemId: number }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleClick() {
    setStatus('loading')

    const res = await fetch('/api/solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ problemId }),
    })
    const data = await res.json()

    if (res.ok) {
      setStatus('done')
    } else if (res.status === 409) {
      setStatus('done')
      setMessage('Already solved')
    } else {
      setStatus('error')
      setMessage(data.error)
    }
  }

  if (status === 'done') {
    return (
      <span className="inline-flex items-center gap-1.5 text-green-400 text-sm font-medium shrink-0">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        {message || 'Solved'}
      </span>
    )
  }

  return (
    <div className="shrink-0">
      <button
        onClick={handleClick}
        disabled={status === 'loading'}
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
          'Mark Solved'
        )}
      </button>
      {status === 'error' && (
        <p className="text-red-400 text-xs mt-1">{message}</p>
      )}
    </div>
  )
}
