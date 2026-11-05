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
    return <span>✓ Solved {message && `(${message})`}</span>
  }

  return (
    <>
      <button onClick={handleClick} disabled={status === 'loading'}>
        {status === 'loading' ? 'Saving...' : 'Mark solved'}
      </button>
      {status === 'error' && <span> {message}</span>}
    </>
  )
}