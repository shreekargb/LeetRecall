import assert from 'node:assert/strict'
import { test } from 'node:test'
import { authRedirect, loginPath, safeReturnPath } from '../lib/auth-navigation.ts'

test('sign-in round trip preserves the intended study page and pagination', () => {
  for (const destination of ['/review/next', '/review/42', '/patterns/12', '/patterns', '/due?page=3', '/problems?q=sum&status=unsolved&page=2']) {
    const url = new URL(destination, 'https://study.example')
    const redirect = authRedirect(url.pathname, url.search, false)
    assert.equal(redirect, loginPath(destination))
    assert.equal(authRedirect('/login', new URL(redirect, url.origin).search, true), destination)
  }
})

test('untrusted return destinations cannot leave the app or enter arbitrary routes', () => {
  for (const value of [undefined, null, ['//evil.example'], 'https://evil.example', '//evil.example',
    '/\\evil.example', '/%2f%2fevil.example', '/review/../login', '/review/%2e%2e/login',
    '/login?next=/login', '/api/solve', '/due\n', ' /due', '/review/0', '/due/' + 'x'.repeat(2048)]) {
    assert.equal(safeReturnPath(value), '/', String(value))
  }
  assert.equal(safeReturnPath('/due?search=https://example.com'), '/due?search=https://example.com')
})

test('public pages stay public and signed-in study visits do not redirect', () => {
  assert.equal(authRedirect('/', '', false), null)
  assert.equal(authRedirect('/patterns-extra', '', false), null)
  assert.equal(authRedirect('/login', '?next=%2Fdue', false), null)
  assert.equal(authRedirect('/review/42', '', true), null)
  assert.equal(authRedirect('/login', '?next=https://evil.example', true), '/')
})
