import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const Input = z.object({ problemId: z.number().int().positive().max(2147483647) })

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Please sign in to remove your progress.' }, { status: 401 })
    const input = Input.safeParse(await request.json().catch(() => null))
    if (!input.success) return NextResponse.json({ error: 'A valid problem ID is required.' }, { status: 400 })
    const { error } = await supabase.rpc('undo_problem_solved', { p_problem_id: input.data.problemId })
    if (error) {
      console.error('Undo solved failed:', error.code)
      return NextResponse.json({ error: 'Could not remove your progress. Please retry.' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Could not confirm removing your progress. Refresh to check before retrying.' }, { status: 500 })
  }
}
