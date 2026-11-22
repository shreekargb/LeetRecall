import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const tests = readdirSync(new URL('./', import.meta.url))
  .filter(name => name.endsWith('.test.mjs'))
  .sort()
  .map(name => `scripts/${name}`)

if (tests.length === 0) {
  console.error('Verification failed: no unit test files were found.')
  process.exit(1)
}

const checks = [
  ['TypeScript', ['node_modules/typescript/bin/tsc', '--noEmit']],
  ['ESLint', ['node_modules/eslint/bin/eslint.js', '.']],
  ['Unit tests', ['--experimental-strip-types', '--test', ...tests]],
]

for (const [label, args] of checks) {
  console.log(`\nRunning ${label}…`)
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' })
  if (result.error || result.status !== 0) {
    console.error(`\n${label} failed. Fix this check before treating the checkpoint as verified.`)
    if (result.error) console.error(result.error.message)
    if (result.signal) console.error(`Stopped by ${result.signal}.`)
    process.exit(result.status || 1)
  }
}

console.log('\nLocal verification passed: TypeScript, ESLint and all unit test files.')
console.log('Not included: production build, SQL regressions, hosted Supabase checks or browser tests.')
