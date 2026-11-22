import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { normalizeUsername } from '@/lib/username'

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Please sign in again to choose your username.' }, { status: 401 })
    const body = await request.json().catch(() => null)
    const username = normalizeUsername(body?.username)
    if (!username) return NextResponse.json({ error: 'Use 3–24 letters, numbers or underscores, starting with a letter.' }, { status: 400 })
    const { data, error } = await supabase.rpc('choose_username', { p_username: username })
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'That username is taken. Please choose another.' }, { status: 409 })
      if (error.code === '55000') return NextResponse.json({ error: 'You already have a username. Reload the page to continue.' }, { status: 409 })
      return NextResponse.json({ error: 'Could not save your username. Please try again.' }, { status: 500 })
    }
    return NextResponse.json({ username: data })
  } catch {
    return NextResponse.json({ error: 'Could not confirm saving. Check your connection and try again.' }, { status: 500 })
  }
}
