import assert from 'node:assert/strict'
import { test } from 'node:test'
import { authRedirect, loginPath, safeReturnPath, confirmationCallbackPath, emailConfirmationDestination } from '../lib/auth-navigation.ts'

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

test('email confirmation preserves safe study destinations and exchanges the code once', async () => {
  const next = '/problems?q=two%20sum&status=unsolved'
  const url = new URL(confirmationCallbackPath(next), 'https://study.example')
  url.searchParams.set('code', 'valid-code')
  const codes = []
  assert.equal(await emailConfirmationDestination(url.searchParams, async code => {
    codes.push(code)
    return true
  }), next)
  assert.deepEqual(codes, ['valid-code'])
  assert.equal(authRedirect('/auth/callback', url.search, false), null)
})

test('confirmation failures strip secrets and preserve a safe login destination', async () => {
  for (const exchange of [async () => false, async () => { throw new Error('private provider diagnostic') }]) {
    const result = await emailConfirmationDestination(new URLSearchParams({ code: 'secret', next: '/due' }), exchange)
    assert.equal(result, '/auth/confirmation-error?next=%2Fdue')
    assert.equal(result.includes('secret'), false)
  }
})

test('missing, malformed and provider-rejected codes never call the exchange', async () => {
  for (const query of ['', 'code=', 'code=a&code=b', 'code=a+b', 'code=valid&error=access_denied', `code=${'a'.repeat(4097)}`]) {
    let calls = 0
    assert.equal(await emailConfirmationDestination(new URLSearchParams(query), async () => {
      calls++
      return true
    }), '/auth/confirmation-error?next=%2F')
    assert.equal(calls, 0)
  }
})

test('confirmation cannot redirect outside study pages', async () => {
  for (const next of ['https://evil.example', '//evil.example', '/api/solve', '/auth/callback']) {
    assert.equal(confirmationCallbackPath(next), '/auth/callback?next=%2F')
    assert.equal(await emailConfirmationDestination(new URLSearchParams({ code: 'valid', next }), async () => true), '/')
  }
})
