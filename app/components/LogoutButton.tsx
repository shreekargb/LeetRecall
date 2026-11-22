'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function LogoutButton() {
  const router = useRouter()
  const busy = useRef(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogout() {
    if (busy.current) return
    busy.current = true
    setLoading(true)
    setError('')
    try {
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      router.replace('/login')
      router.refresh()
    } catch {
      setError('Sign out failed. Check your connection and retry.')
    } finally {
      busy.current = false
      setLoading(false)
    }
  }

  return (
    <div><button
      onClick={handleLogout}
      disabled={loading}
      className="min-h-11 text-gray-300 hover:text-white hover:bg-gray-800 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
    >
      {loading ? 'Signing out…' : 'Sign out'}
    </button>
    {error && <p role="alert" className="max-w-60 p-2 text-sm text-amber-200">{error}</p>}</div>
  )
}
