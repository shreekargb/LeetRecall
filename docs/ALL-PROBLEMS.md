# All problems

The new `/problems` page searches titles across the whole catalogue. Open it from Problems in the signed-in navigation or Search all problems on the Patterns page. Difficulty and solved/unsolved filters combine with title search. Each result identifies its pattern, links to the external problem and supports the existing reliable Mark Solved flow.

Results show 20 items per page in stable ID order. Filter changes start at page one; page links preserve filters. Out-of-range page requests display the last available page, including after solving removes a result from the unsolved view. Sign-in preserves the destination and filters. Account-specific results are read using the cookie-bound client and user ID, with existing RLS still enforced.

The loader reads catalogue and progress in 500-row batches to avoid silently stopping at a single database response limit. Filtering remains in application memory, appropriate for the current small catalogue. A much larger catalogue would benefit from database-side filtered queries. If a later batch fails, incomplete catalogue results are rejected and incomplete progress is marked unavailable, never interpreted as unsolved.

## Manual checks

No new SQL or environment configuration is needed. Start the local app with `npm run dev`.

1. Open Problems and search a title from a different pattern. Confirm its pattern link and Open problem link work.
2. Combine difficulty and Not solved yet. Mark a result solved: it should disappear from that view after refresh. Find it under Solved.
3. Test Next/Previous, then change a filter. Confirm the filter starts at page one. Refresh and use Back/Forward to check URL continuity.
4. Open a filtered URL while signed out and log in. Confirm the destination is retained. Sign in as account B and verify B's own solved state is shown.
5. Try no matches, an oversized page number and a narrow mobile screen. Navigation should wrap and results should remain usable.

Passed: `npm run test:catalogue`, `npm run test:filters`, `npm run test:auth` (11 tests total), TypeScript, ESLint and diff whitespace checks. Tests include a 1,003-row synthetic catalogue, account separation, late batch failures and page bounds. These are local adapter tests, not hosted RLS or browser tests. Full production build remains unverified due to the previously blocked font download.
