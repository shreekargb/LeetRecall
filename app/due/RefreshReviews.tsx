'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

export default function RefreshReviews() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return (
    <button onClick={() => startTransition(() => router.refresh())} disabled={pending}
      className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-indigo-400">
      {pending ? 'Refreshing…' : 'Refresh schedule'}
    </button>
  )
}
