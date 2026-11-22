import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getReviewHistory, parseHistoryParams, historyHref, historyOutcome } from '../lib/review-history.ts'
import { authRedirect, loginPath } from '../lib/auth-navigation.ts'

function database(rows, fail = false) {
  return { from(table) {
    assert.equal(table, 'reviews')
    const filters = []
    const orders = []
    const query = {
      select(_columns, options) { assert.equal(options.count, 'exact'); return query },
      eq(key, value) { filters.push(row => row[key] === value); return query },
      in(key, values) { filters.push(row => values.includes(row[key])); return query },
      order(key, options) { orders.push([key, options]); return query },
      async range(first, last) {
        if (fail) return { error: new Error('offline'), data: null, count: null }
        const matches = rows.filter(row => filters.every(filter => filter(row))).sort((a, b) => {
          for (const [key, options] of orders) {
            assert.equal(options.ascending, false)
            if (a[key] === b[key]) continue
            if (a[key] === null) return 1
            if (b[key] === null) return -1
            return a[key] > b[key] ? -1 : 1
          }
          return 0
        })
        return { data: matches.slice(first, last + 1), count: matches.length, error: null }
      },
    }
    return query
  } }
}
const row = (id, overrides = {}) => ({ id, user_id: 'A', status: 'done', type: 'd1', completed_at: '2026-11-19T10:00:00Z', ...overrides })
test('history is owner-only, excludes pending/expired reviews, and is stable across pages', async () => {
  const rows = [...Array.from({ length: 23 }, (_, i) => row(i + 1)), row(100, { user_id: 'B' }),
    row(101, { status: 'pending' }), row(102, { status: 'expired' }), row(103, { completed_at: null, status: 'failed' })]
  const original = structuredClone(rows)
  const first = await getReviewHistory(database(rows), 'A', parseHistoryParams({}))
  const second = await getReviewHistory(database(rows), 'A', parseHistoryParams({ page: '2' }))
  assert.equal(first.total, 24)
  assert.equal(first.pages, 2)
  assert.equal(first.reviews[0].id, 23)
  assert.equal(second.reviews.at(-1).id, 103)
  assert.equal(new Set([...first.reviews, ...second.reviews].map(r => r.id)).size, 24)
  assert.deepEqual(rows, original)
})
test('type filter changes counts; empty history is distinct from failures', async () => {
  const result = await getReviewHistory(database([row(1), row(2, { type: 'd4' })]), 'A', parseHistoryParams({ type: 'd4' }))
  assert.deepEqual(result.reviews.map(r => r.id), [2])
  assert.equal(result.total, 1)
  assert.equal((await getReviewHistory(database([]), 'A', parseHistoryParams({}))).total, 0)
  await assert.rejects(getReviewHistory(database([], true), 'A', parseHistoryParams({})), /could not be loaded/)
})
test('outcomes preserve Day 1 completion semantics and missing legacy scores', () => {
  assert.equal(historyOutcome({ type: 'd1', status: 'done', score: 1 }), 'Quiz completed · keep practicing')
  assert.equal(historyOutcome({ type: 'd7', status: 'failed', score: 1 }), 'New review cycle started')
  assert.equal(historyOutcome({ type: 'd7', status: 'done', score: 4 }), 'Quiz passed')
  assert.match(historyOutcome({ type: 'd1', status: 'done', score: null }), /unavailable/)
  assert.equal(historyOutcome({ type: 'd4', status: 'done', score: null }), 'Explanation completed')
})
test('invalid filters fall back safely and history survives login redirects', () => {
  assert.deepEqual(parseHistoryParams({ type: ['d1'], page: '-1' }), { type: '', page: 1 })
  const destination = historyHref('d4', 2)
  const login = new URL(loginPath(destination), 'https://study.example')
  assert.equal(authRedirect('/history', '?type=d4&page=2', false), loginPath(destination))
  assert.equal(authRedirect('/login', login.search, true), destination)
})
