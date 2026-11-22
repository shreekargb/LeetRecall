# Review history

Open Review history from the dashboard or View completed reviews from Your reviews. `/history` lists your completed Day 1 quizzes, Day 4 explanations and Day 7 quizzes, newest first, in pages of 20. Filter by type and reopen the existing saved-result pages. Filters and pagination survive sign-in and refresh.

Each entry shows the problem, review type, cycle, completion date (UTC) and quiz score if recorded. A completed Day 1 quiz with a low score is not labelled passed. Failed Day 7 quizzes are shown as starting a new review cycle. Pending and expired reviews are excluded. Legacy records without a completion date are listed last, with an explicit missing-date label. Older reviews may have no immutable attempt or saved feedback; their existing detail page explains that state.

Queries use the cookie-bound authenticated client, an explicit owner filter, existing RLS and exact counts. Database pagination and a completion-date/ID ordering keep pages stable. Page reads do not change reviews. Empty history and database errors have different messages; failures offer Refresh. No new migration is required.

## Test locally

1. Sign in to the development app. Open Review history from the dashboard.
2. Compare a completed quiz's score with View result. Refresh that result URL and confirm the saved outcome persists.
3. Filter Day 4, open an explanation, and confirm saved text/feedback appears when available.
4. Confirm Day 7 failures say a new cycle started and a low-scoring Day 1 is not called passed.
5. If you have more than 20 results, test Next/Previous. Change the type filter and confirm page one is shown. Oversized page numbers redirect to the last available page.
6. Check a new account's empty state, then switch between A and B to verify each sees only their own history. Direct result URLs are still owner-checked.
7. Check narrow screens, keyboard controls and logging in after opening a filtered history URL while signed out.

Automated checks: `npm run test:history` covers owner filtering, completion states, stable pages, missing dates, type filters, failures and login paths using a local read-only adapter. Hosted RLS and browser checks remain manual. Full production build remains unverified due to the earlier blocked font download.
