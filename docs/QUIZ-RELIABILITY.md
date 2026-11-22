# Reliable quiz submission

## Apply in development

Run `supabase/migrations/202611190002_quiz_attempts.sql` once in the development SQL Editor as postgres. It requires both earlier migrations. Do not rerun the initial schema or seed. This migration adds a private quiz_attempts table and a submit_quiz database function; existing reviews/progress are preserved. The updated quiz endpoint requires it.

Then optionally run `supabase/tests/quiz-attempts.sql` as postgres. It uses synthetic catalogue/review records, simulates user roles, injects a failure and rolls the fixtures back. Expected result: `Quiz transaction tests passed; fixtures rolled back`.

## Behavior and concepts

- A transaction grades the quiz, updates the review, saves an immutable result and, on Day 7 failure, creates the next cycle. A failure rolls back all of those changes.
- A per-user/problem transaction lock and the review lock serialize duplicate quiz submissions. Retrying after a lost response returns the original stored result, even if new answers were sent. Exactly one attempt is saved per review.
- The database checks identity, review ownership, due date and all five question IDs/options. Day 7 uses the current user's AI questions for that cycle if available, otherwise the bank. Other users' or other cycles' AI questions are excluded.
- Day 1 always completes the practice review, but the UI reports its actual score/pass result. A low score does not restart the cycle. Day 7 needs 3/5; failure creates a new cycle and expires superseded pending reviews.
- The attempt stores the graded questions, chosen answers and feedback. Refreshing the same completed-review URL reopens that snapshot even if the question bank later changes. Older reviews have no retroactive snapshots; a general history dashboard is future work.
- Network errors/timeouts leave answers in memory and allow retry. Controls are locked during submission. Draft answers before submission are not yet saved across refreshes.
- The unused generic `/api/complete` route returns 410 and performs no writes. Its unused button was removed.

## Review checklist

1. Open a due Day 1 quiz and submit answers. Confirm the score matches and a low score does not claim a pass or restart.
2. Refresh that same review URL: questions, selected answers, score and feedback remain visible.
3. In two tabs opened before submission, submit the same review. The second submission should return the first saved result, not a new attempt/cycle.
4. Try offline submission, reconnect and retry. Confirm there is one quiz_attempts row for the review.
5. Sign in as another user and open the saved review URL. The result must not be visible.
6. Open a future review URL: it shows the opening date instead of the assessment.

Day 7 restart and failure rollback can be verified immediately with the synthetic SQL test, without changing real users' due dates.

## Scope and validation limits

TypeScript, ESLint and local PGlite tests passed. Hosted migration and browser checks are pending. PGlite runs queries serially, so simultaneous browser requests remain a review step. Production build remains unverified because existing Google Fonts downloads were blocked and the earlier network-enabled retry was declined.

This closes the generic HTTP completion bypass, not all database-level self-tampering: authenticated users still have direct review writes needed by the existing explanation/expiry flows, and bank answer keys are still selectable. Moving remaining transitions to controlled database functions and restricting those grants is a later security slice. The existing overdue-page expiry behavior also remains to be replaced. No production deployment has been made.
