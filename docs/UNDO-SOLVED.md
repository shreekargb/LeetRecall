# Undo an accidental solve

Solved problems now show **Undo solved** in both the all-problems catalogue and individual pattern lists. Confirmation explains that this permanently removes the current account's progress, all review cycles, saved quiz attempts, explanations and personalized AI questions for that problem. Cancel leaves everything unchanged. The catalogue, shared bank questions and other accounts are preserved.

## Development setup

Apply `supabase/migrations/202611220001_undo_solved.sql` in the DEVELOPMENT SQL Editor after the five earlier migrations. Run the entire file. It creates a restricted authenticated function; it does not delete any progress merely by being installed. No hosted migration has been applied by the agent.

The API derives ownership from the signed-in session. The function uses the same per-account/problem transaction lock as solves and review submissions and deletes dependents before reviews. Failure rolls back the entire operation. Repeated undo calls without an intervening solve are harmless. Deleted review IDs are not reused, so old browser drafts cannot attach to new reviews. Drafts are not actively erased from browser storage.

## Manual checks

1. Solve one development problem and refresh. Check its three scheduled reviews.
2. Click Undo solved, then Cancel. Progress and reviews must remain.
3. Click Undo solved and confirm. The problem should return to Mark Solved. Refresh Reviews, History and Dashboard to confirm removal/count updates.
4. Refresh an old review URL; it should be unavailable. Another account's progress on the same problem must remain unchanged.
5. Solve again: exactly three new reviews should appear. Repeat via the other problem list and with solved/unsolved filters.
6. On a separate test problem with saved results/explanations, confirm cleanup also removes those results and personalized questions. This cannot be undone; solving again starts fresh.
7. Test failed requests: the UI must report failure and must not claim successful removal. For an uncertain network outcome, refresh to check the current state before retrying.

Local SQL regression covers anonymous rejection, invalid IDs, owner isolation, dependency cleanup, repeated undo, re-solving and rollback on injected failure. Shared-lock concurrency is implemented but not exercised with concurrent database sessions by the local validator. Browser and hosted tests remain required.
