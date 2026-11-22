'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { safeReturnPath } from '@/lib/auth-navigation'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [signupDone, setSignupDone] = useState(false)
  const submitting = useRef(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting.current) return
    submitting.current = true
    setError(null)
    setLoading(true)

    try {
      const supabase = createSupabaseBrowserClient()
      const credentials = { email: email.trim(), password }
      const result = mode === 'login'
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials)
      if (result.error) {
        setError(result.error.message)
      } else if (result.data.session) {
        router.replace(safeReturnPath(new URLSearchParams(window.location.search).get('next')))
        router.refresh()
      } else {
        setSignupDone(true)
        setPassword('')
      }
    } catch {
      setError('Could not connect. Check your connection and try again.')
    } finally {
      submitting.current = false
      setLoading(false)
    }
  }

  if (signupDone) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4">📬</div>
          <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
          <p className="text-gray-400 text-sm">
            If confirmation is required, check <span className="text-indigo-400 font-medium">{email}</span> for an activation link.
            After confirming, return to this tab to log in and continue. If you already have an account, log in.
          </p>
          <button
            onClick={() => { setSignupDone(false); setMode('login') }}
            className="mt-6 text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
          >
            Back to login →
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-4xl">⚡</span>
          <h1 className="text-2xl font-bold text-white mt-2">DSA Recall</h1>
          <p className="text-gray-400 text-sm mt-1">Spaced repetition for DSA mastery</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          {/* Mode toggle */}
          <div className="flex bg-gray-800 rounded-xl p-1 mb-6">
            <button
              type="button"
              disabled={loading}
              aria-pressed={mode === 'login'}
              onClick={() => { setMode('login'); setError(null) }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                mode === 'login'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Log in
            </button>
            <button
              type="button"
              disabled={loading}
              aria-pressed={mode === 'signup'}
              onClick={() => { setMode('signup'); setError(null) }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                mode === 'signup'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                disabled={loading}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                disabled={loading}
                required
                minLength={mode === 'signup' ? 6 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
              <button type="button" onClick={() => setShowPassword(value => !value)}
                aria-pressed={showPassword} aria-controls="password"
                className="mt-2 text-sm text-indigo-300 hover:text-indigo-200">
                {showPassword ? 'Hide password' : 'Show password'}
              </button>
            </div>

            {error && (
              <div role="alert" className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl text-sm transition-colors mt-2"
            >
              {loading
                ? mode === 'login' ? 'Logging in…' : 'Creating account…'
                : mode === 'login' ? 'Log in' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
