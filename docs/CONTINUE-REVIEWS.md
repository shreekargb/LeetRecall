# Continue through due reviews

Saved quiz results and saved explanations now offer Continue to next review, plus links to the review list and history. The control only appears after a confirmed save or when reopening already-saved work. Feedback remains on screen until the user chooses to leave.

The continuation control uses a normal document navigation to `/review/next`. This intentionally avoids reusing a prefetched redirect after a client-side submission. Each click authenticates the current account and reads the latest schedule, then redirects to the oldest pending review due today or earlier (UTC), ordered by due date and ID. It does not create, complete, expire or reserve a review. Another tab can complete a selected review between selection and opening; the existing result page then shows its saved result and offers Continue again.

When nothing is due, the page says You’re caught up for now, shows the next scheduled review if available, and links to the dashboard, history and unsolved problems. Schedule failures show a retry state, not a completion message. An expired login returns here after sign-in. Future reviews are never opened early by this flow.

Day 4 AI evaluation remains separate from saving. If the user leaves before evaluation finishes, they can check or retry feedback from history; no background-worker guarantee is added. The saved explanation and scheduled Day 7 review remain persisted.

## Manual review

No new SQL or Supabase settings are required. Earlier migrations still need to be applied for the original submission flows.

1. Complete a due quiz, read the feedback, then choose Continue to next review. Confirm the next oldest pending review opens.
2. Repeat after saving a Day 4 explanation. Verify the saved text can still be reopened through history.
3. Complete the remaining due work. Continue should display the caught-up page, not open a future review.
4. Open an older saved result from history and continue: it should select current due work, not the next historical record.
5. Sign out and open `/review/next`, then log in. Confirm it resumes with the current account's schedule.
6. Complete a review in another tab before continuing; confirm the latest pending queue is used. Check new-account and upcoming-only states.

The local queue tests cover read-only behavior, ownership, ordering, UTC boundaries, failures and advancement after simulated submissions. Navigation tests cover the new login return path. Actual browser flows remain pending; full production build remains unverified due to the earlier blocked font download.
