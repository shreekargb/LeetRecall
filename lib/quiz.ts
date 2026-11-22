import type { SupabaseClient } from '@supabase/supabase-js'

export type QuizReview = {
  type: string
  user_id: string
  problem_id: number
  cycle_number: number
}

export type QuizQuestion = {
  id: number
  question: string
  options: string[]
  source: string
}

// Answer keys are available only through a completed attempt, never question reads.
const COLUMNS = 'id, question, options, source'

export async function getQuestionsForReview(supabase: SupabaseClient, review: QuizReview): Promise<QuizQuestion[]> {
  if (review.type === 'd7') {
    const { data: aiQuestions, error } = await supabase
      .from('mcqs')
      .select(COLUMNS)
      .eq('problem_id', review.problem_id)
      .eq('user_id', review.user_id)
      .eq('cycle_number', review.cycle_number)
      .eq('source', 'ai')
      .order('id')

    if (error) throw new Error('Unable to load personalized questions')

    if (aiQuestions && aiQuestions.length > 0) {
      return aiQuestions as QuizQuestion[]
    }
  }

  const { data: bankQuestions, error } = await supabase
    .from('mcqs')
    .select(COLUMNS)
    .eq('problem_id', review.problem_id)
    .eq('source', 'bank')
    .is('user_id', null)
    .order('id')

  if (error) throw new Error('Unable to load question bank')
  return (bankQuestions ?? []) as QuizQuestion[]
}
