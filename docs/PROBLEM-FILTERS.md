# Problem search and filters

Each pattern's problem page now supports case-insensitive title search, difficulty selection and account-specific solved/unsolved filters. Choose filters and press Apply filters (or Enter in search). Clear filters returns to the full pattern. Filters combine, and the URL preserves them through refresh, Back/Forward, sharing and sign-in. A shared URL applies the viewer's own progress, never the sender's.

The page shows matching and total counts, plus the pattern's solved count when progress is available. No-match states offer a clear way back. Cards wrap on narrow screens. If progress cannot load, title/difficulty searches still work with All problems; solved/unsolved results are withheld rather than guessed.

The server loads the selected pattern catalogue and the authenticated user's progress, then applies the validated filters in memory. Queries are trimmed and limited to 100 characters; unknown filter values fall back to defaults. Search is literal title matching, not a SQL pattern or regular expression. Only the columns needed for this page are fetched. This is search within a pattern, not across the entire catalogue.

## Test locally

No new migration or Supabase configuration is required. Existing pending migrations still apply to their respective earlier features.

1. Run `npm run dev` and open a pattern with several problems.
2. Search part of a title using different capitalization. Combine it with a difficulty and apply.
3. Select Not solved yet, mark one matching problem solved, and confirm it leaves that filtered list after the page refreshes. Switch to Solved and confirm it appears there.
4. Refresh, copy the URL into another tab, and use browser Back/Forward after changing filters. Confirm controls and results match the URL.
5. Try a nonexistent title. Confirm the no-match message and Show all link.
6. Open the same filtered URL as account B. Solved status should reflect B's own records.
7. Check at a narrow mobile width and with keyboard-only controls.

Automated logic tests: `npm run test:filters`. Browser layout and hosted account checks remain manual; the tests do not claim to simulate a real browser or database outage. Full production build remains unverified because of the existing blocked font download.
