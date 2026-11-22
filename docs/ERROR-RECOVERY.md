# Error recovery

Page and root-layout error screens use the installed Next.js `retry()` API to re-fetch and re-render failed content. Both show pending feedback, disable retry while pending, and provide a full-document Reload page fallback. Error details are not rendered. Recovery navigation and the reminder to check saved review results remain available.

These controls reload content; they do not explicitly resubmit solve, quiz or explanation mutations. A persistent underlying failure can leave the fallback visible. A 404 is a separate missing-page state, not an unexpected-error retry test.

## Manual verification on localhost:3000

For a controlled development-only check, open `/dev/retry-test` and click **Simulate loading failure**. This throws during client rendering into the real app error boundary. Dismiss the Next.js development overlay if it covers the fallback, then click **Try again**. The page should remount and show **Retry test page loaded**. Repeat to check another retry, or use Reload page to check document recovery. The route returns not-found outside development; it does not write to the database. This test does not establish server/database outage recovery or global-error recovery.

1. When the unexpected-error screen appears, click Try again. A fast request may complete before the pending label is noticeable.
2. If the underlying temporary failure has cleared, confirm the original page returns.
3. If failure persists, confirm the screen remains usable and retry becomes available again; use Reload page and verify a document reload occurs.
4. Confirm recovery links work. For a failure during submission, reopen the review and check its saved result before submitting again.
5. Check keyboard access and status announcements. Development error overlays may cover the app fallback; dismiss the overlay to inspect the app controls.

Static verification does not establish browser recovery or resolve the underlying error. Record the failing URL and server-side diagnostic locally if a real page continues to fail; do not share credentials or tokens.
