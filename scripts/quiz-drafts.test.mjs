import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createQuizDraftStore, parseQuizDraft, questionSignature, quizDraftKey } from '../lib/quiz-drafts.ts'

const questions = [{ id: 1, question: 'Which option?', options: ['A', 'B', 'C', 'D'] },
  { id: 2, question: 'Next question?', options: ['E', 'F', 'G', 'H'] }]
function storage() {
  const rows = new Map()
  return { getItem: key => rows.get(key) ?? null, setItem: (key, value) => rows.set(key, value), removeItem: key => rows.delete(key) }
}
test('answers recover after remount, isolated by account and review', () => {
  const db = storage()
  const key = quizDraftKey('A', 1)
  const draft = createQuizDraftStore(key, questions, () => db)
  draft.choose(1, 2)
  draft.choose(2, 0)
  assert.deepEqual(createQuizDraftStore(key, questions, () => db).getSnapshot().answers, { 1: 2, 2: 0 })
  assert.deepEqual(createQuizDraftStore(quizDraftKey('B', 1), questions, () => db).getSnapshot().answers, {})
  assert.deepEqual(createQuizDraftStore(quizDraftKey('A', 2), questions, () => db).getSnapshot().answers, {})
})
test('changed question wording, IDs or option ordering invalidate old choices', () => {
  const raw = JSON.stringify({ version: 1, signature: questionSignature(questions), answers: { 1: 2 } })
  for (const change of [{ question: 'Changed?' }, { id: 99 }, { options: ['B', 'A', 'C', 'D'] }]) {
    assert.deepEqual(parseQuizDraft(raw, [{ ...questions[0], ...change }, questions[1]]), {})
  }
})
test('malformed drafts and invalid answer values cannot populate the quiz', () => {
  for (const raw of [null, '', '{bad', 'null', '[]', '{"version":2}']) assert.deepEqual(parseQuizDraft(raw, questions), {})
  const encode = answers => JSON.stringify({ version: 1, signature: questionSignature(questions), answers })
  for (const choice of [-1, 4, 0.5, '2', null]) assert.deepEqual(parseQuizDraft(encode({ 1: choice }), questions), {})
  assert.deepEqual(parseQuizDraft(encode({ 1: 0, 999: 3 }), questions), { 1: 0 })
})
test('failed writes preserve selections in memory and a later successful write recovers persistence', () => {
  const db = storage()
  let blocked = true
  const draft = createQuizDraftStore('key', questions, () => ({ ...db, setItem(key, value) {
    if (blocked) throw new Error('Quota exceeded')
    db.setItem(key, value)
  } }))
  draft.choose(1, 3)
  assert.deepEqual(draft.getSnapshot(), { answers: { 1: 3 }, storageAvailable: false })
  blocked = false
  draft.choose(2, 1)
  assert.deepEqual(draft.getSnapshot(), { answers: { 1: 3, 2: 1 }, storageAvailable: true })
  assert.deepEqual(createQuizDraftStore('key', questions, () => db).getSnapshot().answers, { 1: 3, 2: 1 })
})
test('blocked reads still permit in-memory use and stable snapshots', () => {
  const draft = createQuizDraftStore('key', questions, () => { throw new Error('Denied') })
  draft.choose(1, 0)
  const snapshot = draft.getSnapshot()
  assert.equal(draft.getSnapshot(), snapshot)
  assert.deepEqual(snapshot, { answers: { 1: 0 }, storageAvailable: false })
  draft.clear()
  assert.deepEqual(draft.getSnapshot().answers, {})
})
test('clearing a submitted review preserves other drafts and notifies subscribers', () => {
  const db = storage()
  const draft = createQuizDraftStore('one', questions, () => db)
  const other = createQuizDraftStore('two', questions, () => db)
  other.choose(2, 2)
  let events = 0
  const unsubscribe = draft.subscribe(() => events++)
  draft.choose(1, 1)
  draft.clear()
  assert.equal(events, 2)
  assert.equal(db.getItem('one'), null)
  assert.deepEqual(other.getSnapshot().answers, { 2: 2 })
  unsubscribe()
})
test('external changes are reread without causing unstable snapshots', () => {
  const db = storage()
  const a = createQuizDraftStore('key', questions, () => db)
  const b = createQuizDraftStore('key', questions, () => db)
  a.getSnapshot()
  b.choose(1, 2)
  a.refresh()
  assert.deepEqual(a.getSnapshot().answers, { 1: 2 })
  assert.equal(a.getSnapshot(), a.getSnapshot())
})
