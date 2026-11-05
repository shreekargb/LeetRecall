import { Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import SolveButton from './solve'

async function ProblemList({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: problems, error } = await supabase
    .from('problems')
    .select('*')
    .eq('pattern_id', id)

  if (error) {
    return <p>Something went wrong: {error.message}</p>
  }

  return (
    <ul>
      {problems?.map((problem) => (
        <li key={problem.id}>
          {problem.title} ({problem.difficulty}){' '}
          <SolveButton problemId={problem.id} />
        </li>
      ))}
    </ul>
  )
}

export default function PatternPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <main>
      <h1>Problems</h1>
      <Suspense fallback={<p>Loading problems...</p>}>
        <ProblemList params={params} />
      </Suspense>
    </main>
  )
}