import type { SupabaseClient } from '@supabase/supabase-js'

export type CatalogueProblem = {
  id: number; title: string; difficulty: string | null; link: string | null;
  pattern_id: number | null; patterns: { name: string } | null
}

const BATCH = 500
export async function getProblemCatalogue(client: SupabaseClient, userId: string) {
  async function catalogue() {
    const rows: CatalogueProblem[] = []
    for (let offset = 0; ; offset += BATCH) {
      const { data, error } = await client.from('problems')
        .select('id,title,difficulty,link,pattern_id,patterns(name)').order('id').range(offset, offset + BATCH - 1)
      if (error) throw new Error('Problem catalogue could not be loaded')
      rows.push(...(data ?? []) as unknown as CatalogueProblem[])
      if (!data || data.length < BATCH) return rows
    }
  }
  async function progress(): Promise<Set<number> | null> {
    const ids = new Set<number>()
    for (let offset = 0; ; offset += BATCH) {
      const { data, error } = await client.from('user_problems').select('problem_id')
        .eq('user_id', userId).order('problem_id').range(offset, offset + BATCH - 1)
      if (error) return null
      for (const row of data ?? []) ids.add(row.problem_id)
      if (!data || data.length < BATCH) return ids
    }
  }
  const [problems, solvedIds] = await Promise.all([catalogue(), progress()])
  return { problems, solvedIds }
}

export function cataloguePage<T>(rows: T[], requested: unknown) {
  const pageCount = Math.max(1, Math.ceil(rows.length / 20))
  const parsed = typeof requested === 'string' && /^[1-9]\d{0,5}$/.test(requested) ? Number(requested) : 1
  const page = Math.min(parsed, pageCount)
  return { page, pageCount, rows: rows.slice((page - 1) * 20, page * 20) }
}
