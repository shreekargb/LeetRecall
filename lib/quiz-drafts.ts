type Question = { id: number; question: string; options: string[] }
type StorageAccess = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
type Answers = Record<number, number>
export type QuizDraftSnapshot = { answers: Answers; storageAvailable: boolean }
export const EMPTY_QUIZ_DRAFT: QuizDraftSnapshot = { answers: {}, storageAvailable: true }

export function quizDraftKey(userId: string, reviewId: number) {
  return `dsa-recall:quiz:${userId}:${reviewId}`
}

export function questionSignature(questions: Question[]) {
  // Include option order and wording: an old choice must not answer a changed question.
  return JSON.stringify(questions.map(q => [q.id, q.question, q.options]))
}

export function parseQuizDraft(raw: string | null, questions: Question[]): Answers {
  if (!raw) return {}
  try {
    const value = JSON.parse(raw)
    if (value?.version !== 1 || value.signature !== questionSignature(questions)
      || !value.answers || typeof value.answers !== 'object' || Array.isArray(value.answers)) return {}
    const answers: Answers = {}
    for (const q of questions) {
      const answer = value.answers[q.id]
      if (Number.isInteger(answer) && answer >= 0 && answer < q.options.length) answers[q.id] = answer
    }
    return answers
  } catch { return {} }
}

// Created per mounted account/review, with no shared user data at module scope.
export function createQuizDraftStore(key: string, questions: Question[], storage: () => StorageAccess) {
  let snapshot = EMPTY_QUIZ_DRAFT
  let previousRaw: string | null | undefined
  let memoryOnly = false
  const listeners = new Set<() => void>()
  const notify = () => listeners.forEach(listener => listener())
  function getSnapshot() {
    if (memoryOnly) return snapshot
    try {
      const raw = storage().getItem(key)
      if (raw !== previousRaw || !snapshot.storageAvailable) {
        previousRaw = raw
        snapshot = { answers: parseQuizDraft(raw, questions), storageAvailable: true }
      }
    } catch {
      memoryOnly = true
      snapshot = { ...snapshot, storageAvailable: false }
    }
    return snapshot
  }
  return {
    getSnapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    refresh: notify,
    choose(questionId: number, option: number) {
      const question = questions.find(q => q.id === questionId)
      if (!question || !Number.isInteger(option) || option < 0 || option >= question.options.length) return
      const answers = { ...getSnapshot().answers, [questionId]: option }
      const raw = JSON.stringify({ version: 1, signature: questionSignature(questions), answers })
      try {
        storage().setItem(key, raw)
        previousRaw = raw
        memoryOnly = false
        snapshot = { answers, storageAvailable: true }
      } catch {
        memoryOnly = true
        snapshot = { answers, storageAvailable: false }
      }
      notify()
    },
    clear() {
      // Even if removal fails, never restore a stale draft in this mounted result.
      memoryOnly = true
      snapshot = EMPTY_QUIZ_DRAFT
      try { storage().removeItem(key) } catch { /* Server result takes precedence. */ }
      notify()
    },
  }
}
