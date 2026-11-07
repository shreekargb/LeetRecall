import { connection } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import Link from 'next/link'
import LogoutButton from './LogoutButton'

export default async function NavbarUserSection() {
  await connection()
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <Link
        href="/login"
        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        Log in
      </Link>
    )
  }

  return (
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
  )
}
