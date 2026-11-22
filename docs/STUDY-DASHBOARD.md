# Personal study dashboard

Signed-in users now see a personal dashboard at `/`. Signed-out visitors retain the introductory page and pattern browser. The static 25/193/965 counters have been removed.

The dashboard shows actual solved-problem and completed-review counts. Completed reviews include both successful submissions and failed Day 7 quizzes that started a new cycle; pending and expired reviews are excluded. Reviews ready includes overdue and today's pending work, with separate counts shown below. Dates use UTC consistently with review scheduling.

The next action opens the oldest pending due review, using the existing read-only schedule helper and stable date/ID order. If no work is due, the dashboard links to unsolved problems and shows the next scheduled review when present. It previews up to three upcoming reviews and links to all reviews, problems and patterns. Opening or refreshing this page performs no progress mutations.

Counts use exact, head-only database queries scoped to the current user. Count queries and the schedule run independently; unavailable statistics remain explicitly unavailable rather than becoming zero. The dashboard uses the request's authenticated client and existing RLS. No privileged database client is used.

## Manual checks

No new SQL or Supabase settings are required. Run `npm run dev` and open the homepage.

1. Signed out: confirm the introduction and pattern catalogue remain available.
2. Account A: compare solved problems and ready/overdue counts against Problems and Your reviews. Confirm the main action opens the oldest due review.
3. Complete a review, return home and refresh. Ready count should decrease and completed count increase, accounting for any newly scheduled cycle.
4. Account B: confirm only B's progress is reflected. A new account should see zero progress and an invitation to solve a first problem.
5. With no due work, confirm upcoming dates are informative and future reviews are not presented as ready to start.
6. Check keyboard navigation, narrow-screen card stacking and the Refresh control.

Run `npm run test:dashboard` for account-scoped counts, completion semantics, empty accounts and partial failure tests. `npm run test:reviews` covers read-only schedules, overdue retention, ordering/pagination and UTC dates. These are local tests; live browser and hosted checks remain pending. Full production build remains unverified because of the earlier blocked font download.
