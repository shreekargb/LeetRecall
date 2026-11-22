'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { normalizeUsername } from '@/lib/username'
import { safeReturnPath, loginPath } from '@/lib/auth-navigation'

export default function UsernameForm({ next }: { next: string }) {
  const router = useRouter()
  const saving = useRef(false)
  const [username, setUsername] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (saving.current) return
    const name = normalizeUsername(username)
    if (!name) { setError('Use 3–24 letters, numbers or underscores, starting with a letter.'); return }
    saving.current = true
    setPending(true)
    setError('')
    try {
      const response = await fetch('/api/username', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name }), signal: AbortSignal.timeout(15000),
      })
      if (response.status === 401) { router.replace(loginPath(next)); return }
      const data = await response.json()
      if (!response.ok || !data.username) throw new Error(data.error || 'Could not save your username.')
      router.replace(safeReturnPath(next))
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error && cause.name === 'Error' ? cause.message
        : 'Could not confirm saving. Check your connection and retry with the same username.')
    } finally { saving.current = false; setPending(false) }
  }

  return <form onSubmit={submit} className="mt-8 space-y-4">
    <label htmlFor="username" className="block font-medium">Username</label>
    <input id="username" name="username" value={username} onChange={event => setUsername(event.target.value)}
      autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={3} maxLength={24}
      disabled={pending} aria-describedby="username-help username-error" aria-invalid={Boolean(error)}
      className="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-3 text-white" />
    <p id="username-help" className="text-sm text-gray-400">3–24 letters, numbers or underscores. Start with a letter. Usernames are saved in lowercase and cannot be changed here later. You’ll still log in with your email.</p>
    <p id="username-error" role="alert" className="text-sm text-red-300">{error}</p>
    <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
      {pending ? 'Saving…' : 'Save and continue'}
    </button>
  </form>
}
