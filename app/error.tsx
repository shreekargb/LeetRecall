'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'

export default function PageError({ retry }: { error: unknown; retry: () => void }) {
  const [pending, startTransition] = useTransition()
  const [attempted, setAttempted] = useState(false)
  function tryAgain() {
    if (pending) return
    setAttempted(true)
    startTransition(() => retry())
  }
  return <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
    <div className="rounded-2xl border border-amber-800 bg-gray-900 p-6 sm:p-8">
      <h1 className="text-2xl font-bold text-white">This page couldn’t load</h1>
      <p role="alert" className="mt-3 text-gray-300">Something went wrong. Check your connection and try again.</p>
      <p className="mt-2 text-sm text-gray-400">If this happened during submission, reopen the review to check whether your result was saved before retrying.</p>
      <button type="button" onClick={tryAgain} disabled={pending} aria-busy={pending}
        className="mt-6 min-h-11 rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
        {pending ? 'Trying again…' : 'Try again'}
      </button>
      <p role="status" className="mt-3 text-sm text-gray-300">
        {pending ? 'Loading the page again…' : attempted ? 'If this screen remains, the page is still unavailable. You can retry or reload the page.' : 'Try again to reload this page’s content.'}
      </p>
      <button type="button" onClick={() => window.location.reload()} disabled={pending}
        className="mt-3 min-h-11 rounded-lg border border-gray-600 px-5 py-3 text-white hover:bg-gray-800 disabled:opacity-50">
        Reload page
      </button>
      <nav aria-label="Recovery options" className="mt-6 flex flex-wrap gap-5 text-sm text-indigo-300">
        <Link href="/">Dashboard</Link><Link href="/due">Your reviews</Link><Link href="/history">Saved results</Link>
      </nav>
    </div>
  </main>
}
