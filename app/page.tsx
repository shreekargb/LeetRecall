import Link from 'next/link'
import { Suspense } from 'react'
import { supabase } from '@/lib/supabase'

type Pattern = {
  id: number
  name: string
  problem_count: number
}

async function PatternsGrid() {
  // Fetch patterns with problem count
  const { data: patterns, error } = await supabase
    .from('patterns')
    .select('id, name, problems(count)')
    .order('name')

  if (error) {
    return (
      <p className="text-red-400 text-center py-10">
        Failed to load patterns: {error.message}
      </p>
    )
  }

  const patternList: Pattern[] = (patterns ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    problem_count: (p.problems as unknown as { count: number }[])?.[0]?.count ?? 0,
  }))

  if (patternList.length === 0) {
    return (
      <p className="text-gray-400 text-center py-10">
        No patterns found. Import your CSV first.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {patternList.map((pattern) => (
        <Link
          key={pattern.id}
          href={`/patterns/${pattern.id}`}
          className="group block bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-indigo-500 rounded-xl p-5 transition-all duration-200"
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-white font-semibold text-base group-hover:text-indigo-400 transition-colors leading-snug">
              {pattern.name}
            </h3>
            <span className="shrink-0 bg-indigo-900/50 text-indigo-300 text-xs font-medium px-2.5 py-1 rounded-full border border-indigo-800">
              {pattern.problem_count} {pattern.problem_count === 1 ? 'problem' : 'problems'}
            </span>
          </div>
          <p className="mt-3 text-sm text-gray-500 group-hover:text-gray-400 transition-colors">
            View problems →
          </p>
        </Link>
      ))}
    </div>
  )
}

function PatternsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse"
        >
          <div className="h-5 bg-gray-800 rounded w-3/4 mb-3" />
          <div className="h-3 bg-gray-800 rounded w-1/4" />
        </div>
      ))}
    </div>
  )
}

export default function HomePage() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero section */}
      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-2 bg-indigo-900/30 border border-indigo-800 text-indigo-300 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <span>⚡</span>
          Spaced Repetition for DSA
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
          Master DSA Patterns
        </h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto mb-8">
          Solve problems, review them at the right intervals, and let AI identify your gaps — so nothing slips through the cracks.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/due"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
          >
            View Due Reviews
          </Link>
          <Link
            href="/patterns"
            className="bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
          >
            Browse All Patterns
          </Link>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {[
          { label: 'Patterns', value: '25' },
          { label: 'Problems', value: '193' },
          { label: 'MCQs', value: '965' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center"
          >
            <div className="text-2xl font-bold text-indigo-400">{stat.value}</div>
            <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Patterns grid */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">All Patterns</h2>
        <Link href="/patterns" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
          View all →
        </Link>
      </div>
      <Suspense fallback={<PatternsGridSkeleton />}>
        <PatternsGrid />
      </Suspense>
    </main>
  )
}
