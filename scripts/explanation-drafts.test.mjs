import assert from 'node:assert/strict'
import { test } from 'node:test'
import { explanationDraftKey, readDraft, writeDraft, clearDraft } from '../lib/explanation-drafts.ts'
import { parseGaps } from '../lib/explanations.ts'

test('drafts survive reload and clearing one preserves other accounts and reviews', () => {
  const entries = new Map()
  const storage = { getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) }
  const first = explanationDraftKey('user-a', 1)
  const second = explanationDraftKey('user-b', 1)
  const otherReview = explanationDraftKey('user-a', 2)
  writeDraft(storage, first, 'My reasoning — with edge cases')
  writeDraft(storage, second, 'Another account')
  writeDraft(storage, otherReview, 'Another review')
  assert.equal(readDraft(storage, first), 'My reasoning — with edge cases')
  clearDraft(storage, first)
  assert.equal(readDraft(storage, first), '')
  assert.equal(readDraft(storage, second), 'Another account')
  assert.equal(readDraft(storage, otherReview), 'Another review')
})

test('unavailable storage is surfaced to the caller', () => {
  const storage = { setItem() { throw new Error('Quota exceeded') } }
  assert.throws(() => writeDraft(storage, 'key', 'draft'), /Quota exceeded/)
})

test('malformed legacy feedback is not interpreted as successful empty feedback', () => {
  for (const value of [null, '', 'not JSON', '{}', '[1]']) assert.equal(parseGaps(value), null)
  assert.deepEqual(parseGaps('[]'), [])
  assert.deepEqual(parseGaps('["Explain complexity"]'), ['Explain complexity'])
})
