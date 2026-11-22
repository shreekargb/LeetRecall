import Link from 'next/link'
import type { ProblemFilters as Filters } from '@/lib/problem-filters'

export default function ProblemFilters({ basePath, filters }: { basePath: string; filters: Filters }) {
  const field = 'mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white focus-visible:outline-2 focus-visible:outline-indigo-400'
  return (
    <form action={basePath} method="get" role="search" aria-label="Filter problems"
      className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm text-gray-300">Search problem titles
          <input type="search" name="q" defaultValue={filters.q} maxLength={100}
            placeholder="e.g. two sum" className={field} />
        </label>
        <label className="text-sm text-gray-300">Difficulty
          <select name="difficulty" defaultValue={filters.difficulty} className={field}>
            <option value="">All difficulties</option>
            <option>Easy</option><option>Medium</option><option>Hard</option>
          </select>
        </label>
        <label className="text-sm text-gray-300">Your progress
          <select name="status" defaultValue={filters.status} className={field}>
            <option value="all">All problems</option>
            <option value="unsolved">Not solved yet</option>
            <option value="solved">Solved</option>
          </select>
        </label>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">Apply filters</button>
        <Link href={basePath} className="text-sm text-indigo-300 hover:text-indigo-200">Clear filters</Link>
      </div>
    </form>
  )
}
