'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CompleteButton({ reviewId }: { reviewId: number }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleClick() {
    setLoading(true)
    setError('')

    const res = await fetch('/api/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewId }),
    })
    const data = await res.json()

    if (res.ok) {
      router.refresh()
    } else {
      setError(data.error)
      setLoading(false)
    }
  }

  return (
    <>
      <button onClick={handleClick} disabled={loading}>
        {loading ? 'Saving...' : 'Mark done'}
      </button>
      {error && <span> {error}</span>}
    </>
  )
}