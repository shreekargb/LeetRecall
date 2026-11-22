# Review schedule UX

This slice is local application code only. No migration, seed or SQL setup is required.

## What changed

- Opening /due no longer expires old pending reviews or starts replacement cycles. The old mutation helpers were removed; quiz failure still restarts a cycle through its explicit submission transaction.
- Overdue work remains available until completed or superseded by an explicit quiz restart. Already expired historical records are not restored by this change.
- Counts distinguish overdue, due today and upcoming work. Due reviews are ordered oldest first, with stable ID ordering for ties, and paginated in groups of 20.
- The next five upcoming reviews are shown with their dates and the full upcoming count. Future reviews are not offered as actionable quizzes.
- Empty schedules and failed queries have different messages. A refresh button retries loading without changing progress.
- Schedule dates use UTC to match the transactional solve/quiz functions. A user timezone preference remains future work.
- Cards stack on smaller screens, display full titles, and have descriptive review links.

## Review checklist

1. Open /due with an existing account. Check overdue/today/upcoming counts against its pending records in the development database.
2. Refresh the page several times. Confirm review IDs, cycle numbers, statuses and due dates stay unchanged.
3. Check a future review appears under Coming up; if no work is due, the empty state names the next date.
4. Check overdue work remains visible and Start oldest review opens the earliest pending review.
5. If more than 20 reviews are due, use Next/Previous and confirm no reviews are skipped or repeated.
6. Sign in as a second account. Only its schedule should appear.
7. Check the layout on a narrow/mobile viewport and navigate controls using the keyboard.

## Validation

`npm run test:reviews` uses Node 22's TypeScript stripping with an in-memory read-only Supabase adapter. Tests cover old overdue preservation over repeated reads, user/status filtering, stable pagination/totals, UTC boundaries, empty schedules and failure handling. These do not substitute for a real browser or hosted database check. TypeScript/ESLint results are recorded in STATUS.md. The production-build font download blocker remains unresolved.
