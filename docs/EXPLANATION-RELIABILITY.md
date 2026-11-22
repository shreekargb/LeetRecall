# Reliable written reviews

This step changes local development only. It does not apply hosted SQL, commit, push or deploy.

## Development setup

1. Confirm the initial schema, atomic-solve and quiz-attempt migrations have already been applied in your development Supabase project.
2. Run the whole file `supabase/migrations/202611190003_explanations.sql` once in that project's SQL Editor. Do not rerun the seed or initial schema. If it fails, keep the error for diagnosis; do not delete existing records. Historical duplicate explanations deliberately stop the migration rather than being discarded.
3. The feedback endpoint needs the development project's server-only `SUPABASE_SERVICE_ROLE_KEY` and existing AI configuration. Never prefix that key with `NEXT_PUBLIC_` or copy a production key into development.
4. Start the local app with `npm run dev`.

## Browser review

- Open a due Day 4 review. Write at least 30 characters, refresh, and confirm the draft returns. Another account or another review should have its own draft.
- Disconnect before submitting. Confirm an error leaves the draft available. Reconnect and retry.
- Submit successfully. Confirm the saved text appears and Day 7 is scheduled three UTC calendar days later. Refresh the same review URL: the explanation and any saved feedback should remain.
- If AI feedback fails, confirm the explanation remains saved and feedback can be requested separately. Up to three claims are allowed; a stalled claim can be replaced after a minute. Existing bank questions remain available if generation fails.
- Open the saved review URL as the second account: it must not reveal the first account's explanation.
- Recheck solving a problem and submitting a due quiz after applying the new permissions.

Use naturally due reviews or dedicated development fixtures. Do not change production dates to accelerate testing.

## Technical overview

`submit_explanation` checks the signed-in owner, review type, due date and text length. It saves text, completes Day 4 and reschedules the pending Day 7 review in one transaction. If any step fails, none are saved. Repeated submissions return the original explanation.

Drafts use browser local storage keyed by account and review. They do not sync across devices, and browser storage is not encrypted by this feature. A confirmed server save clears the corresponding draft.

AI work is a separate request after saving, or an explicit retry. There is no background worker. A service-only claim token prevents duplicate active generation and stale responses; finalization saves feedback and five personalized questions together. Questions are no longer replaced once Day 7 is due. Provider requests have timeouts. Direct authenticated writes to reviews, explanations and MCQs are revoked; validated transition functions perform the app's mutations.

## Validation

Run `npm run test:explanations`, `npm run test:reviews`, `npx tsc --noEmit` and `npm run lint` locally. The disposable PostgreSQL validator also runs explanation submission, permission, rollback, feedback retry and lease tests alongside solve/quiz/isolation regressions. It does not connect to hosted Supabase. Browser and live-provider checks remain manual. Full production build validation remains incomplete because the existing Google Fonts download was blocked.
