import test from 'node:test'
import assert from 'node:assert/strict'
import { getReviewQueue } from '../lib/reviews.ts'

// Read-only in-memory adapter: mutation methods deliberately do not exist.
function database(rows, fail = false) {
  return {
    from(table) {
      assert.equal(table, 'reviews')
      const filters = []
      const orders = []
      let first = 0
      let last = Infinity
      let head = false
      const query = {
        select(_columns, options) { head = !!options?.head; return query },
        eq(key, value) { filters.push(row => row[key] === value); return query },
        lt(key, value) { filters.push(row => row[key] < value); return query },
        lte(key, value) { filters.push(row => row[key] <= value); return query },
        gt(key, value) { filters.push(row => row[key] > value); return query },
        order(key) { orders.push(key); return query },
        range(start, end) { first = start; last = end; return query },
        limit(count) { last = count - 1; return query },
        then(resolve, reject) {
          const matching = rows.filter(row => filters.every(filter => filter(row))).sort((a, b) => {
            for (const key of orders) {
              if (a[key] < b[key]) return -1
              if (a[key] > b[key]) return 1
            }
            return 0
          })
          return Promise.resolve(fail ? { error: { message: 'Unavailable' }, data: null, count: null }
            : { error: null, data: head ? null : structuredClone(matching.slice(first, last + 1)), count: matching.length })
            .then(resolve, reject)
        },
      }
      return query
    },
  }
}

const row = (id, due_date, user_id = 'A', status = 'pending') => ({
  id, due_date, user_id, status, type: 'd1', problem_id: id,
  problems: { title: `Problem ${id}`, link: null },
})

test('repeated page reads preserve old overdue work and isolate user records', async () => {
  const rows = [row(1, '2026-10-01'), row(2, '2026-11-19'), row(3, '2026-11-20'),
    row(4, '2026-11-18', 'B'), row(5, '2026-11-18', 'A', 'done'), row(6, '2026-11-18', 'A', 'expired')]
  const original = structuredClone(rows)
  const now = new Date('2026-11-19T12:00:00Z')
  const first = await getReviewQueue(database(rows), 'A', 1, now)
  assert.equal(first.dueCount, 2)
  assert.equal(first.overdueCount, 1)
  assert.equal(first.upcomingCount, 1)
  assert.deepEqual(first.due.map(r => r.id), [1, 2])
  assert.deepEqual(first.upcoming.map(r => r.id), [3])
  assert.deepEqual(await getReviewQueue(database(rows), 'A', 1, now), first)
  assert.deepEqual(rows, original)
})

test('pagination retains accurate totals and stable order without hiding later due work', async () => {
  const rows = Array.from({ length: 47 }, (_, i) => row(47 - i, '2026-11-19'))
  rows.push(...Array.from({ length: 8 }, (_, i) => row(100 + i, '2026-11-20')))
  const now = new Date('2026-11-19T12:00:00Z')
  const pages = await Promise.all([1, 2, 3].map(page => getReviewQueue(database(rows), 'A', page, now)))
  assert.deepEqual(pages.map(p => p.due.length), [20, 20, 7])
  assert.deepEqual(pages.flatMap(p => p.due.map(r => r.id)), Array.from({ length: 47 }, (_, i) => i + 1))
  assert.ok(pages.every(p => p.dueCount === 47 && p.upcomingCount === 8 && p.upcoming.length === 5))
})

test('UTC boundaries match the database review dates, not the browser timezone', async () => {
  const queue = await getReviewQueue(database([row(1, '2026-11-19'), row(2, '2026-11-20')]),
    'A', 1, new Date('2026-11-20T01:00:00+05:30'))
  assert.equal(queue.today, '2026-11-19')
  assert.deepEqual(queue.due.map(r => r.id), [1])
  assert.deepEqual(queue.upcoming.map(r => r.id), [2])
})

test('empty schedules are distinct from database failures', async () => {
  const queue = await getReviewQueue(database([]), 'A')
  assert.equal(queue.dueCount + queue.upcomingCount, 0)
  await assert.rejects(getReviewQueue(database([], true), 'A'), /Unable to load/)
  await assert.rejects(getReviewQueue(database([]), 'A', 0), /Invalid review page/)
})

test('continuation advances after submissions and skips completed, expired, future and other-user work', async () => {
  const rows = [row(2, '2026-11-18'), row(1, '2026-11-18'), row(3, '2026-11-19'),
    row(4, '2026-11-20'), row(5, '2026-11-01', 'B')]
  const db = database(rows)
  const now = new Date('2026-11-19T12:00:00Z')
  assert.equal((await getReviewQueue(db, 'A', 1, now)).due[0].id, 1)
  // Simulate committed submissions from this tab or another tab, then read afresh.
  rows.find(r => r.id === 1).status = 'done'
  assert.equal((await getReviewQueue(db, 'A', 1, now)).due[0].id, 2)
  rows.find(r => r.id === 2).status = 'failed'
  rows.find(r => r.id === 3).status = 'expired'
  const final = await getReviewQueue(db, 'A', 1, now)
  assert.equal(final.due.length, 0)
  assert.equal(final.dueCount, 0)
  assert.equal(final.upcoming[0].id, 4)
})
