import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { loginPath } from '@/lib/auth-navigation'
import { cataloguePage, getProblemCatalogue } from '@/lib/problem-catalogue'
import { filterProblems, parseProblemFilters, problemFilterQuery, type ProblemSearchParams } from '@/lib/problem-filters'
import ProblemFilters from '../patterns/[id]/ProblemFilters'
import SolveButton from '../patterns/[id]/solve'

async function Catalogue({ searchParams }: { searchParams: Promise<ProblemSearchParams> }) {
  const params = await searchParams
  const filters = parseProblemFilters(params)
  const query = problemFilterQuery(filters)
  const href = (page: number) => `/problems${query}${query ? '&' : '?'}page=${page}`
  const client = await createSupabaseServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) {
    const page = typeof params.page === 'string' && /^[1-9]\d{0,5}$/.test(params.page) ? Number(params.page) : 1
    redirect(loginPath(href(page)))
  }
  let catalogue
  try { catalogue = await getProblemCatalogue(client, user.id) } catch {
    return <p role="alert" className="rounded-xl border border-red-800 p-5 text-red-300">
      Problems could not be loaded. <Link href={href(1)} className="underline">Try again</Link>.
    </p>
  }
  const { problems, solvedIds } = catalogue
  const matches = filterProblems(problems, solvedIds, filters)
  const result = cataloguePage(matches ?? [], params.page)
  return <>
    <ProblemFilters key={`${user.id}-${query}`} basePath="/problems" filters={filters} />
    {solvedIds === null && <p role="alert" className="mb-4 rounded-xl border border-amber-800 p-4 text-amber-200">
      Saved progress could not be loaded. Refresh to retry. Choose All problems to search without progress filtering.
    </p>}
    {matches === null ? <p className="text-gray-300">Results for this progress filter are unavailable.</p> : <>
      <p role="status" className="mb-4 text-sm text-gray-400">{matches.length} matching problems out of {problems.length} across all patterns.</p>
      {matches.length === 0 ? <div className="rounded-xl border border-gray-800 p-6 text-gray-300">
        <p>{problems.length ? 'No problems match these filters.' : 'The problem catalogue is empty.'}</p>
        {problems.length > 0 && <Link href="/problems" className="mt-3 inline-block text-indigo-300">Clear filters</Link>}
      </div> : <ul className="space-y-3">
        {result.rows.map(problem => <li key={problem.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="min-w-40 flex-1 break-words">
            <h2 className="font-medium text-gray-100">{problem.title}</h2>
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              {problem.pattern_id && <Link href={`/patterns/${problem.pattern_id}`} className="text-indigo-300 hover:underline">
                {problem.patterns?.name ?? 'View pattern'}
              </Link>}
              <span className="text-gray-400">{problem.difficulty ?? 'Difficulty not listed'}</span>
              {problem.link && <a href={problem.link} target="_blank" rel="noopener noreferrer"
                aria-label={`Open ${problem.title} in a new tab`} className="text-indigo-300 hover:underline">Open problem ↗</a>}
            </div>
          </div>
          <SolveButton key={`${user.id}-${problem.id}-${solvedIds?.has(problem.id)}-${solvedIds === null}`} problemId={problem.id}
            initiallySolved={solvedIds?.has(problem.id) ?? false} progressUnavailable={solvedIds === null} />
        </li>)}
      </ul>}
      {result.pageCount > 1 && <nav aria-label="Problem result pages" className="mt-6 flex items-center justify-between gap-4 text-sm">
        {result.page > 1 ? <Link href={href(result.page - 1)} className="text-indigo-300">← Previous</Link> : <span />}
        <span className="text-gray-400">Page {result.page} of {result.pageCount}</span>
        {result.page < result.pageCount ? <Link href={href(result.page + 1)} className="text-indigo-300">Next →</Link> : <span />}
      </nav>}
    </>}
  </>
}

export default function ProblemsPage({ searchParams }: { searchParams: Promise<ProblemSearchParams> }) {
  return <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
    <h1 className="text-3xl font-bold text-white">All problems</h1>
    <p className="mb-8 mt-2 text-gray-400">Search across every pattern and find your next problem.</p>
    <Suspense fallback={<p role="status" className="text-gray-400">Loading problems…</p>}>
      <Catalogue searchParams={searchParams} />
    </Suspense>
  </main>
}
