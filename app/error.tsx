'use client'

import Link from 'next/link'
import { useTransition } from 'react'

export default function PageError({ retry }: { error: unknown; retry: () => void }) {
  const [pending, startTransition] = useTransition()
  return <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
    <div className="rounded-2xl border border-amber-800 bg-gray-900 p-6 sm:p-8">
      <h1 className="text-2xl font-bold text-white">This page couldn’t load</h1>
      <p role="alert" className="mt-3 text-gray-300">Something went wrong. Check your connection and try again.</p>
      <p className="mt-2 text-sm text-gray-400">If this happened during submission, reopen the review to check whether your result was saved before retrying.</p>
      <button onClick={() => startTransition(() => retry())} disabled={pending}
        className="mt-6 min-h-11 rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
        {pending ? 'Trying again…' : 'Try again'}
      </button>
      <nav aria-label="Recovery options" className="mt-6 flex flex-wrap gap-5 text-sm text-indigo-300">
        <Link href="/">Dashboard</Link><Link href="/due">Your reviews</Link><Link href="/history">Saved results</Link>
      </nav>
    </div>
  </main>
}
