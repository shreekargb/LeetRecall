import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { loginPath, safeReturnPath } from '@/lib/auth-navigation'
import UsernameForm from './UsernameForm'

async function WelcomeContent({ searchParams }: {
  searchParams: Promise<{ next?: string | string[] }>
}) {
  const next = safeReturnPath((await searchParams).next)
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(loginPath(next))
  const { data: profile, error } = await supabase.from('profiles').select('username')
    .eq('user_id', user.id).maybeSingle()
  if (error) throw new Error('Username profile could not be loaded')
  if (profile) redirect(next)
  return <main className="mx-auto w-full max-w-lg px-4 py-16">
    <h1 className="text-3xl font-bold">Choose your username</h1>
    <p className="mt-3 text-gray-300">Welcome to DSA Recall. Pick a unique username to finish setting up your account.</p>
    <UsernameForm next={next} />
  </main>
}

export default function WelcomePage(props: { searchParams: Promise<{ next?: string | string[] }> }) {
  return <Suspense fallback={<p role="status" className="p-8">Loading your profile…</p>}>
    <WelcomeContent {...props} />
  </Suspense>
}
