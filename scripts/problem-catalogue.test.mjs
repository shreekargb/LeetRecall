import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cataloguePage, getProblemCatalogue } from '../lib/problem-catalogue.ts'

function database(failedTable, failureOffset = 0) {
  const problems = Array.from({ length: 1003 }, (_, index) => ({ id: index + 1, title: `Problem ${index}`, pattern_id: index % 25 }))
  const progress = [...problems.map(p => ({ user_id: 'A', problem_id: p.id })), { user_id: 'B', problem_id: 3 }]
  return { from(table) {
    let owner
    const query = {
      select() { return query },
      order() { return query },
      eq(key, value) { assert.equal(key, 'user_id'); owner = value; return query },
      async range(first, last) {
        if (table === failedTable && first >= failureOffset) return { data: null, error: new Error('Unavailable') }
        if (table === 'user_problems') assert.ok(owner, 'Progress must always be scoped to the current user')
        const rows = table === 'problems' ? problems : progress.filter(row => row.user_id === owner)
        return { data: rows.slice(first, last + 1), error: null }
      },
    }
    return query
  } }
}

test('catalogue and progress span multiple batches without truncating or mixing accounts', async () => {
  const a = await getProblemCatalogue(database(), 'A')
  const b = await getProblemCatalogue(database(), 'B')
  assert.equal(a.problems.length, 1003)
  assert.equal(a.solvedIds.size, 1003)
  assert.equal(a.problems.at(-1).id, 1003)
  assert.deepEqual([...b.solvedIds], [3])
})
test('partial failures discard incomplete data rather than misreporting totals or progress', async () => {
  await assert.rejects(getProblemCatalogue(database('problems', 500), 'A'), /could not be loaded/)
  const result = await getProblemCatalogue(database('user_problems', 500), 'A')
  assert.equal(result.problems.length, 1003)
  assert.equal(result.solvedIds, null)
})
test('pagination is stable and safely clamps pages after filtering or solving', () => {
  const rows = Array.from({ length: 41 }, (_, i) => i)
  assert.deepEqual(cataloguePage(rows, '2').rows, rows.slice(20, 40))
  assert.equal(cataloguePage(rows, '999').page, 3)
  assert.equal(cataloguePage(rows.slice(0, 20), '3').page, 1)
  for (const value of ['-2', '0', 'abc', ['2'], undefined]) assert.equal(cataloguePage(rows, value).page, 1)
  assert.deepEqual(cataloguePage([], '5'), { page: 1, pageCount: 1, rows: [] })
})
