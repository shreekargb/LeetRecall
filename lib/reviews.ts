import { supabase } from './supabase'
import { TEST_USER_ID } from './constants'
import { connection } from 'next/server'
import { addDays, scheduleReviews, toDateString } from './scheduler'
export type DueReview = {
  id: number
  type: string
  due_date: string
  problem_id: number
  problems: { title: string; link: string | null } | null
}

export async function startNewCycle(userId: string, problemId: number) {
  await connection()

  const { data: last } = await supabase
    .from('reviews')
    .select('cycle_number')
    .eq('user_id', userId)
    .eq('problem_id', problemId)
    .order('cycle_number', { ascending: false })
    .limit(1)
    .single()

  const nextCycle = (last?.cycle_number ?? 0) + 1

  const rows = scheduleReviews(new Date()).map((r) => ({
    user_id: userId,
    problem_id: problemId,
    cycle_number: nextCycle,
    type: r.type,
    due_date: toDateString(r.due_date),
  }))

  const { error } = await supabase.from('reviews').insert(rows)
  if (error) throw new Error(error.message)
}

export async function expireOverdueReviews() {
   await connection()
  const cutoff = toDateString(addDays(new Date(), -2))

  const { data: overdue, error } = await supabase
    .from('reviews')
    .select('id, problem_id')
    .eq('user_id', TEST_USER_ID)
    .eq('status', 'pending')
    .lt('due_date', cutoff)

  if (error) throw new Error(error.message)
  if (!overdue || overdue.length === 0) return

  const problemIds = Array.from(new Set(overdue.map((r) => r.problem_id)))

  for (const problemId of problemIds) {
    const { error: expireError } = await supabase
      .from('reviews')
      .update({ status: 'expired' })
      .eq('user_id', TEST_USER_ID)
      .eq('problem_id', problemId)
      .eq('status', 'pending')

    if (expireError) throw new Error(expireError.message)

    await startNewCycle(TEST_USER_ID, problemId)
  }
}

export async function getDueReviews(): Promise<DueReview[]> {
  await expireOverdueReviews()
  await connection()

  const today = toDateString(new Date())
  const { data, error } = await supabase
    .from('reviews')
    .select('id, type, due_date, problem_id, problems(title, link)')
    .eq('user_id', TEST_USER_ID)
    .eq('status', 'pending')
    .lte('due_date', today)
    .order('due_date')

  if (error) throw new Error(error.message)
  return data as unknown as DueReview[]
}