import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseProblemFilters, filterProblems, problemFilterQuery } from '../lib/problem-filters.ts'
import { loginPath, authRedirect } from '../lib/auth-navigation.ts'

const problems = [
  { id: 1, title: 'Two Sum', difficulty: 'Easy' },
  { id: 2, title: 'Two Sum II', difficulty: 'Medium' },
  { id: 3, title: 'Maximum Sum', difficulty: 'Hard' },
  { id: 4, title: 'Unknown difficulty', difficulty: null },
]
test('title, difficulty and per-account progress filters combine without modifying catalogue', () => {
  const filters = parseProblemFilters({ q: '  TWO SUM  ', difficulty: 'Medium', status: 'unsolved' })
  assert.deepEqual(filterProblems(problems, new Set([1]), filters).map(p => p.id), [2])
  assert.deepEqual(filterProblems(problems, new Set([2]), filters), [])
  assert.equal(problems.length, 4)
})
test('newly solved items leave the unsolved view; other account progress is independent', () => {
  const filters = parseProblemFilters({ status: 'unsolved' })
  assert.deepEqual(filterProblems(problems, new Set([1, 2]), filters).map(p => p.id), [3, 4])
  assert.deepEqual(filterProblems(problems, new Set(), filters), problems)
  assert.deepEqual(filterProblems(problems, new Set([1, 2]), { ...filters, status: 'solved' }).map(p => p.id), [1, 2])
})
test('unavailable progress is distinct from no matches and does not hide title-only results', () => {
  assert.equal(filterProblems(problems, null, parseProblemFilters({ status: 'unsolved' })), null)
  assert.equal(filterProblems(problems, null, parseProblemFilters({ status: 'solved' })), null)
  assert.equal(filterProblems(problems, null, parseProblemFilters({ q: 'sum' })).length, 3)
  assert.deepEqual(filterProblems(problems, new Set(), parseProblemFilters({ q: 'absent' })), [])
})
test('invalid and repeated query parameters fall back safely, special characters are literal', () => {
  assert.deepEqual(parseProblemFilters({ q: ['one', 'two'], status: 'unknown', difficulty: 'Impossible' }), { q: '', status: 'all', difficulty: '' })
  assert.equal(parseProblemFilters({ q: 'x'.repeat(200) }).q.length, 100)
  assert.deepEqual(filterProblems(problems, new Set(), parseProblemFilters({ q: '%' })), [])
  assert.equal(problemFilterQuery(parseProblemFilters({})), '')
})
test('filters round trip through URL encoding and sign-in', () => {
  const filters = parseProblemFilters({ q: 'sum & count?', difficulty: 'Easy', status: 'solved' })
  const query = problemFilterQuery(filters)
  assert.deepEqual(parseProblemFilters(Object.fromEntries(new URLSearchParams(query))), filters)
  const login = new URL(loginPath(`/patterns/2${query}`), 'https://study.example')
  assert.equal(authRedirect(login.pathname, login.search, true), `/patterns/2${query}`)
})
