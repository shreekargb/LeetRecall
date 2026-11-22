'use client'

import { useState } from 'react'

export default function RetryTest() {
  const [fail, setFail] = useState(false)

  // Throw during rendering so the real app/error.tsx boundary handles it.
  // A successful retry remounts this component with fail=false.
  if (fail) throw new Error('Intentional local retry test: no database changes')

  return <main className="mx-auto max-w-2xl px-4 py-16">
    <h1 className="text-3xl font-bold">Retry test page loaded</h1>
    <p className="mt-4 text-gray-300">This development-only page simulates a temporary rendering failure. It does not change your study records.</p>
    <ol className="mt-6 list-decimal space-y-3 pl-6 text-gray-300">
      <li>Click Simulate loading failure below.</li>
      <li>If the development error overlay appears, close it to see the app’s error screen.</li>
      <li>Click Try again on the “This page couldn’t load” screen.</li>
      <li>If you return here and see “Retry test page loaded”, recovery worked.</li>
    </ol>
    <button type="button" onClick={() => setFail(true)}
      className="mt-6 min-h-11 rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-500">
      Simulate loading failure
    </button>
    <p className="mt-4 text-sm text-gray-400">This checks the page error boundary and retry control. It does not simulate a database outage or a root-layout failure.</p>
  </main>
}
