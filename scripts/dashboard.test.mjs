import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getDashboardCounts } from '../lib/dashboard.ts'

function database(fail, reject = false) {
  const tables = {
    problems: [{ id: 1 }, { id: 2 }, { id: 3 }],
    user_problems: [{ user_id: 'A' }, { user_id: 'A' }, { user_id: 'B' }],
    reviews: [{ user_id: 'A', status: 'done' }, { user_id: 'A', status: 'failed' },
      { user_id: 'A', status: 'pending' }, { user_id: 'A', status: 'expired' }, { user_id: 'B', status: 'done' }],
  }
  return { from(table) {
    const filters = []
    let scoped = false
    const query = {
      select(_columns, options) { assert.deepEqual(options, { count: 'exact', head: true }); return query },
      eq(key, value) { assert.equal(key, 'user_id'); scoped = true; filters.push(row => row[key] === value); return query },
      in(key, values) { filters.push(row => values.includes(row[key])); return query },
      then(resolve, onReject) {
        if (table !== 'problems') assert.ok(scoped, 'Personal statistics must be scoped to the account')
        const result = table === fail
          ? reject ? Promise.reject(new Error('offline')) : Promise.resolve({ count: null, error: { message: 'offline' } })
          : Promise.resolve({ count: tables[table].filter(row => filters.every(filter => filter(row))).length, error: null })
        return result.then(resolve, onReject)
      },
    }
    return query
  } }
}

test('counts reflect each account and completed work, excluding pending and expired reviews', async () => {
  assert.deepEqual(await getDashboardCounts(database(), 'A'), { totalProblems: 3, solvedProblems: 2, completedReviews: 2 })
  assert.deepEqual(await getDashboardCounts(database(), 'B'), { totalProblems: 3, solvedProblems: 1, completedReviews: 1 })
})
test('a new account has real zero counts', async () => {
  assert.deepEqual(await getDashboardCounts(database(), 'new'), { totalProblems: 3, solvedProblems: 0, completedReviews: 0 })
})
test('returned errors and thrown failures leave unaffected statistics available', async () => {
  for (const reject of [false, true]) {
    assert.deepEqual(await getDashboardCounts(database('user_problems', reject), 'A'),
      { totalProblems: 3, solvedProblems: null, completedReviews: 2 })
    assert.deepEqual(await getDashboardCounts(database('problems', reject), 'A'),
      { totalProblems: null, solvedProblems: 2, completedReviews: 2 })
  }
})
