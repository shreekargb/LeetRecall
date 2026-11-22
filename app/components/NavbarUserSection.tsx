import { connection } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import Link from 'next/link'
import StudyNavigation from './StudyNavigation'

export default async function NavbarUserSection() {
  await connection()
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <Link
        href="/login"
        className="flex min-h-11 items-center bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        Log in
      </Link>
    )
  }

  const { data: profile } = await supabase.from('profiles').select('username').eq('user_id', user.id).maybeSingle()
  return <StudyNavigation key={user.id} username={profile?.username ?? null} />
}
