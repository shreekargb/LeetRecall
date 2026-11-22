# Reliable solved progress

## Apply in development

Run only `supabase/migrations/202611190001_atomic_solve.sql` in the development SQL Editor as postgres. Do not rerun the initial schema or seed. The migration preserves existing records and may safely be reapplied. The updated solve API requires this migration before it can save new solves.

The database function derives the user from the authenticated session. A transaction saves the solved record and all three reviews together. A per-user/problem transaction lock serializes repeated solve calls. Direct authenticated inserts into user_problems are revoked so app clients cannot skip scheduling. Other review lifecycle operations are unchanged and will be addressed separately.

The function recovers an old solved record with no review history when called again, using its original solved date. The current UI shows existing solved records as solved and does not automatically invoke recovery for them. Existing review history is never reset by solve retries. Day offsets use UTC dates consistently; user-specific timezones remain a later feature.

## User-visible changes

- Solved labels load from the signed-in user's saved records and survive refresh/login.
- Newly saved solves show the next pending review date (UTC).
- Network failures/timeouts offer a safe retry instead of leaving Saving stuck.
- Failed progress reads show an error and disable solve actions rather than displaying unreliable progress.

## Review checklist

1. Existing solved problems remain Solved after refreshing and signing in again.
2. Solve an unsolved problem: it shows Solved and a review date. Exactly one solved record and three reviews are saved.
3. In two tabs for the same account, open the same unsolved problem before clicking either button. Mark it solved in both. Confirm one solved record and three reviews, not six.
4. Take the browser offline, try to solve a different problem, then reconnect and retry. Confirm an error followed by success with no duplicates. An aborted browser request can still finish on the server; retry is safe.
5. A second account can solve the same problem independently and cannot see the first account's saved progress.

Optional hosted SQL regression: run `supabase/tests/atomic-solve.sql` as postgres in development. It uses synthetic records and rolls them back. Expected output: `Atomic solve tests passed; fixtures rolled back`.

## Validation limits

Local PGlite tests cover dates, repeat calls/migration, owner separation, missing IDs, legacy partial-save recovery, direct-insert rejection and rollback after an injected review failure. PGlite serializes queries; true simultaneous browser requests require checklist step 3. Hosted migration and browser checks remain user review steps. No production changes were applied.
