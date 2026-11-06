import { Suspense } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

async function PatternList() {
  const { data: patterns, error } = await supabase
    .from('patterns')
    .select('id, name, problems(count)')
    .order('name')

  if (error) {
    return (
      <div className="text-red-400 bg-red-900/20 border border-red-800 rounded-xl p-4">
        Something went wrong: {error.message}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {patterns?.map((pattern) => {
        const count = (pattern.problems as unknown as { count: number }[])?.[0]?.count ?? 0
        return (
          <Link
            key={pattern.id}
            href={`/patterns/${pattern.id}`}
            className="group block bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-indigo-500 rounded-xl p-5 transition-all duration-200"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-white font-semibold text-sm group-hover:text-indigo-400 transition-colors leading-snug">
                {pattern.name}
              </h3>
              <span className="shrink-0 bg-indigo-900/50 text-indigo-300 text-xs font-medium px-2.5 py-1 rounded-full border border-indigo-800">
                {count} {count === 1 ? 'problem' : 'problems'}
              </span>
            </div>
            <p className="mt-3 text-xs text-gray-600 group-hover:text-gray-500 transition-colors">
              View problems →
            </p>
          </Link>
        )
      })}
    </div>
  )
}

function PatternListSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse">
          <div className="h-4 bg-gray-800 rounded w-3/4 mb-3" />
          <div className="h-3 bg-gray-800 rounded w-1/4" />
        </div>
      ))}
    </div>
  )
}

export default function PatternsPage() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">All Patterns</h1>
        <p className="text-gray-400 mt-2">Pick a pattern to see its problems and start solving.</p>
      </div>
      <Suspense fallback={<PatternListSkeleton />}>
        <PatternList />
      </Suspense>
    </main>
  )
}
