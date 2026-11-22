import assert from 'node:assert/strict'
import { test } from 'node:test'
import { normalizeUsername } from '../lib/username.ts'
import { needsUsernameCheck, usernameOnboardingPath } from '../lib/auth-navigation.ts'

test('usernames normalize case and surrounding whitespace', () => {
  assert.equal(normalizeUsername('  Cheeku_123  '), 'cheeku_123')
  assert.equal(normalizeUsername('a'.repeat(24)), 'a'.repeat(24))
})

test('invalid usernames cannot be submitted', () => {
  for (const input of [null, {}, '', 'ab', 'a'.repeat(25), '1name', '_name', 'two names',
    'name@example.com', '<script>', 'a/b', 'a\\b', 'a\nb', '🔥name']) {
    assert.equal(normalizeUsername(input), null)
  }
})

test('onboarding preserves safe destinations without permitting loops or external redirects', () => {
  assert.equal(usernameOnboardingPath('/due?page=2'), '/welcome?next=%2Fdue%3Fpage%3D2')
  for (const input of ['/welcome', '/auth/callback', '//evil.example', 'https://evil.example']) {
    assert.equal(usernameOnboardingPath(input), '/welcome?next=%2F')
  }
})

test('profile checks gate study pages without blocking onboarding, auth, APIs or local tests', () => {
  for (const path of ['/', '/due', '/history', '/problems', '/patterns/1', '/review/next']) {
    assert.equal(needsUsernameCheck(path), true)
  }
  for (const path of ['/welcome', '/login', '/auth/callback', '/auth/confirmation-error', '/api/username', '/dev/retry-test', '/problems-extra']) {
    assert.equal(needsUsernameCheck(path), false)
  }
})
