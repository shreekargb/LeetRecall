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
      <div>
        <p>Explanation saved. Your day 7 quiz has been scheduled.</p>
        {gaps === null && <p>AI feedback is unavailable for this problem right now.</p>}
        {gaps !== null && gaps.length === 0 && <p>No major gaps found. Nice work.</p>}
        {gaps !== null && gaps.length > 0 && (
          <div>
            <p>Gaps to work on:</p>
            <ul>
              {gaps.map((gap, i) => (
                <li key={i}>{gap}</li>
              ))}
            </ul>
          </div>
        )}
        <Link href="/due">Back to due reviews</Link>
      </div>
    )
  }

  return (
    <div>
      <p>Explain the approach in your own words: which technique, why it works, and the key steps.</p>
      <textarea
        rows={8}
        style={{ width: '100%' }}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <p>{text.trim().length} / {MIN_LENGTH} characters minimum</p>
      <button onClick={handleSubmit} disabled={text.trim().length < MIN_LENGTH || loading}>
        {loading ? 'Evaluating...' : 'Submit explanation'}
      </button>
      {error && <p>{error}</p>}
    </div>
  )
}