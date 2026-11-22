'use client'

import { useState, useTransition } from 'react'

export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  const [pending, startTransition] = useTransition()
  const [attempted, setAttempted] = useState(false)
  function tryAgain() {
    if (pending) return
    setAttempted(true)
    startTransition(() => retry())
  }
  // Independent of the root layout, fetched fonts, authentication and navigation.
  return <html lang="en"><body style={{ margin: 0, background: '#030712', color: '#f9fafb', fontFamily: 'Arial, sans-serif' }}>
    <main style={{ maxWidth: 640, margin: '64px auto', padding: 24 }}>
      <h1>DSA Recall couldn’t open</h1>
      <p role="alert">The app encountered an unexpected problem. Try again or return to the homepage.</p>
      <p>If you were submitting a review, check its saved result after reconnecting.</p>
      <button type="button" onClick={tryAgain} disabled={pending} aria-busy={pending} style={{ minHeight: 44, padding: '12px 20px', background: '#4f46e5', color: 'white', border: 0, borderRadius: 8, fontSize: 16, cursor: 'pointer', opacity: pending ? 0.5 : 1 }}>{pending ? 'Trying again…' : 'Try again'}</button>
      <p role="status">{pending ? 'Loading the app again…' : attempted ? 'If this screen remains, the app is still unavailable. You can retry or reload the page.' : 'Try again to reload the app’s content.'}</p>
      <button type="button" onClick={() => window.location.reload()} disabled={pending} style={{ minHeight: 44, padding: '12px 20px', background: '#1f2937', color: 'white', border: '1px solid #6b7280', borderRadius: 8, fontSize: 16, cursor: 'pointer' }}>Reload page</button>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- A root-layout failure needs an independent document navigation. */}
      <a href="/" style={{ display: 'inline-block', marginLeft: 20, padding: '12px 0', color: '#c7d2fe' }}>Return home</a>
    </main>
  </body></html>
}
