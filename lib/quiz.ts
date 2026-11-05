import { supabase } from './supabase'

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
  correct_index: number
  explanation: string | null
  source: string
}

const COLUMNS = 'id, question, options, correct_index, explanation, source'

export async function getQuestionsForReview(review: QuizReview): Promise<QuizQuestion[]> {
  if (review.type === 'd7') {
    const { data: aiQuestions } = await supabase
      .from('mcqs')
      .select(COLUMNS)
      .eq('problem_id', review.problem_id)
      .eq('user_id', review.user_id)
      .eq('cycle_number', review.cycle_number)
      .eq('source', 'ai')
      .order('id')

    if (aiQuestions && aiQuestions.length > 0) {
      return aiQuestions as QuizQuestion[]
    }
  }

  const { data: bankQuestions } = await supabase
    .from('mcqs')
    .select(COLUMNS)
    .eq('problem_id', review.problem_id)
    .eq('source', 'bank')
    .order('id')

  return (bankQuestions ?? []) as QuizQuestion[]
}