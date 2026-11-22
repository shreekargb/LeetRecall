import { Suspense } from 'react'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'
import SolveButton from './solve'
import { loginPath } from '@/lib/auth-navigation'
import { filterProblems, parseProblemFilters, problemFilterQuery, type ProblemSearchParams } from '@/lib/problem-filters'
import ProblemFilters from './ProblemFilters'
import { isValidRouteId } from '@/lib/route-id'

function DifficultyBadge({ difficulty }: { difficulty: string | null }) {
  if (!difficulty) return null
  const styles: Record<string, string> = {
    Easy: 'bg-green-900/50 text-green-400 border-green-800',
    Medium: 'bg-yellow-900/50 text-yellow-400 border-yellow-800',
    Hard: 'bg-red-900/50 text-red-400 border-red-800',
  }
  const style = styles[difficulty] ?? 'bg-gray-800 text-gray-400 border-gray-700'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      {difficulty}
    </span>
  )
}

async function ProblemList({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<ProblemSearchParams>
}) {
  const { id } = await params
  if (!isValidRouteId(id)) notFound()
  const filters = parseProblemFilters(await searchParams)
  const query = problemFilterQuery(filters)
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(loginPath(`/patterns/${id}${query}`))

  // Fetch pattern name + problems in one go
  const [patternRes, problemsRes] = await Promise.all([
    supabase.from('patterns').select('name').eq('id', id).maybeSingle(),
    supabase.from('problems').select('id,title,link,difficulty').eq('pattern_id', id).order('id'),
  ])

  if (problemsRes.error || patternRes.error) {
    return (
      <div role="alert" className="text-red-400 bg-red-900/20 border border-red-800 rounded-xl p-4">
        This pattern could not be loaded. Refresh to retry, or <Link href="/patterns" className="underline">browse patterns</Link>.
      </div>
    )
  }

  if (!patternRes.data) notFound()

  const patternName = patternRes.data?.name ?? 'Pattern'
  const problems = problemsRes.data ?? []
  const { data: progress, error: progressError } = problems.length > 0
    ? await supabase.from('user_problems').select('problem_id')
      .eq('user_id', user.id).in('problem_id', problems.map(p => p.id))
    : { data: [], error: null }
  const solvedIds = new Set((progress ?? []).map(p => p.problem_id))
  const visibleProblems = filterProblems(problems, progressError ? null : solvedIds, filters)

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/patterns"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-4"
        >
          ← Back to Patterns
        </Link>
        <h1 className="text-3xl font-bold text-white">{patternName}</h1>
        <p className="text-gray-400 mt-2">
          {problems.length} {problems.length === 1 ? 'problem' : 'problems'} in this pattern
        </p>
      </div>

      <ProblemFilters key={`${user.id}-${query}`} basePath={`/patterns/${id}`} filters={filters} />

      {/* Problems list */}
      {progressError && (
        <p role="alert" className="mb-4 rounded-xl border border-amber-800 bg-amber-900/20 p-4 text-sm text-amber-200">
          Your saved progress could not be loaded. Refresh the page to try again.
        </p>
      )}
      {visibleProblems !== null && <p role="status" className="mb-4 text-sm text-gray-400">
        Showing {visibleProblems.length} of {problems.length} problems
        {!progressError && ` · ${solvedIds.size} solved in this pattern`}
      </p>}
      {visibleProblems === null ? (
        <p className="rounded-xl border border-amber-800 p-5 text-amber-200">
          Progress filters are unavailable until your saved progress loads. Retry by refreshing, or choose All problems and apply filters.
        </p>
      ) : problems.length === 0 ? (
        <p className="text-gray-500">No problems found for this pattern.</p>
      ) : visibleProblems.length === 0 ? (
        <div className="rounded-xl border border-gray-800 p-6 text-gray-300">
          <p>No problems match these filters. Try a different title or difficulty.</p>
          <Link href={`/patterns/${id}`} className="mt-3 inline-block text-indigo-300">Show all problems in this pattern</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleProblems.map((problem, index) => (
            <div
              key={problem.id}
              className="flex flex-wrap items-center gap-4 bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl px-5 py-4 transition-colors"
            >
              {/* Index */}
              <span className="text-gray-600 text-sm font-mono w-6 shrink-0 text-right">
                {index + 1}
              </span>

              {/* Title + link */}
              <div className="flex-1 min-w-40 break-words">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-gray-100 font-medium text-sm">
                    {problem.title}
                  </span>
                  {problem.link && (
                    <a
                      href={problem.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 transition-colors shrink-0"
                      title="Open problem"
                      aria-label={`Open ${problem.title} in a new tab`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>

              {/* Difficulty badge */}
              <DifficultyBadge difficulty={problem.difficulty} />

              {/* Solve button */}
              <SolveButton
                key={`${user.id}-${problem.id}`}
                problemId={problem.id}
                initiallySolved={solvedIds.has(problem.id)}
                progressUnavailable={!!progressError}
              />
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function ProblemListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="h-4 bg-gray-800 rounded w-4" />
            <div className="h-4 bg-gray-800 rounded flex-1 max-w-xs" />
            <div className="h-5 bg-gray-800 rounded w-14" />
            <div className="h-8 bg-gray-800 rounded w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function PatternPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<ProblemSearchParams>
}) {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Suspense fallback={<ProblemListSkeleton />}>
        <ProblemList params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  )
}
