export type ProblemSearchParams = Record<string, string | string[] | undefined>
export type ProblemFilters = { q: string; difficulty: string; status: 'all' | 'solved' | 'unsolved' }

export function parseProblemFilters(params: ProblemSearchParams): ProblemFilters {
  return {
    q: typeof params.q === 'string' ? params.q.trim().slice(0, 100) : '',
    difficulty: typeof params.difficulty === 'string' && ['Easy', 'Medium', 'Hard'].includes(params.difficulty) ? params.difficulty : '',
    status: params.status === 'solved' || params.status === 'unsolved' ? params.status : 'all',
  }
}

export function problemFilterQuery(filters: ProblemFilters) {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.difficulty) params.set('difficulty', filters.difficulty)
  if (filters.status !== 'all') params.set('status', filters.status)
  const query = params.toString()
  return query ? `?${query}` : ''
}

export function filterProblems<T extends { id: number; title: string; difficulty: string | null }>(
  problems: T[], solvedIds: ReadonlySet<number> | null, filters: ProblemFilters,
): T[] | null {
  // Unknown progress must never be interpreted as unsolved.
  if (solvedIds === null && filters.status !== 'all') return null
  const query = filters.q.toLowerCase()
  return problems.filter(problem => problem.title.toLowerCase().includes(query)
    && (!filters.difficulty || problem.difficulty === filters.difficulty)
    && (filters.status === 'all' || (filters.status === 'solved' ? solvedIds!.has(problem.id) : !solvedIds!.has(problem.id))))
}
