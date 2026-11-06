import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import LogoutButton from './LogoutButton'

export default async function Navbar() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / App name */}
          <Link
            href="/"
            className="flex items-center gap-2 text-white font-bold text-xl tracking-tight hover:text-indigo-400 transition-colors"
          >
            <span className="text-indigo-400">⚡</span>
            DSA Recall
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {user ? (
              <>
                <Link
                  href="/patterns"
                  className="text-gray-300 hover:text-white hover:bg-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Patterns
                </Link>
                <Link
                  href="/due"
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Due Today
                </Link>
                <span className="hidden sm:block text-gray-600 text-xs ml-2 mr-1 truncate max-w-[140px]">
                  {user.email}
                </span>
                <LogoutButton />
              </>
            ) : (
              <Link
                href="/login"
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Log in
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
