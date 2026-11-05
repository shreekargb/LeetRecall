import { Suspense } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

async function PatternList() {
  const { data: patterns, error } = await supabase
    .from('patterns')
    .select('*')

  if (error) {
    return <p>Something went wrong: {error.message}</p>
  }

  return (
    <ul>
      {patterns?.map((pattern) => (
        <li key={pattern.id}>
          <Link href={`/patterns/${pattern.id}`}>{pattern.name}</Link>
        </li>
      ))}
    </ul>
  )
}

export default function PatternsPage() {
  return (
    <main>
      <h1>Patterns</h1>
      <Suspense fallback={<p>Loading patterns...</p>}>
        <PatternList />
      </Suspense>
    </main>
  )
}