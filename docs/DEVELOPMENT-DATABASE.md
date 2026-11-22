# Development database setup

Use the NEW development Supabase project's SQL Editor, not production.

1. Run `supabase/migrations/202611140001_initial_schema.sql` once. It creates all six tables in a transaction and fails if they already exist. Do not delete existing tables to fix an error; inspect it first.
2. Run `supabase/seed.sql`. Expected totals in an empty project: 25 patterns, 193 problems, 965 bank MCQs. Re-running sequentially does not duplicate the bundled questions.

   If the SQL Editor reports `relation "Baskets" does not exist`, use `npm run db:seed` from the project directory instead. Compare the displayed project reference with the development dashboard URL and type it to confirm. This uses structured API requests instead of the editor's SQL execution path. It requires the matching development service-role key in `.env.local`. It does not modify users or progress. Unlike the SQL transaction, this import uses several requests; a failure may leave partial catalogue data. Sequential retries skip existing questions and upsert patterns/problems. Do not run concurrent imports. The editor error's root cause is not confirmed.
3. Run `supabase/tests/user-isolation.sql`. It tests anonymous restrictions, owner reads, own updates, cross-user updates, spoofed ownership and cross-user review attachments. Test rows are rolled back; sequence numbers can advance. A failure is not a successful check.
4. Use development URL, anonymous/publishable key and service-role/secret key consistently in `.env.local`. Never commit that file. Restart the local dev server after changes.
5. Create two test accounts and test the actual login, solve, quiz and explanation flows. The SQL test simulates JWT identity; it does not validate browser auth, cookies or API behavior.

## Differences from production

The supplied report is preserved in `production-schema-report.json`. Column types, nullability, defaults and original constraints are preserved. Additional query indexes are included. Public catalogue reads are allowed, catalogue writes require privileged access, and private records are limited to their owners. Anonymous clients have no private-table privileges. AI question inserts must belong to the caller's Day 4 review.

The production export shows permissive `Allow all` policies and anonymous write grants on all six tables. Those policies are intentionally NOT copied. No production changes have been applied. Production needs a separate reviewed migration coordinated with deployment of authenticated data access.

This initial migration is not a complete assessment-integrity solution: authenticated users can still alter their own review state and read bank answer keys via the database API. Server-controlled scoring, atomic transitions, stronger integrity constraints and expiry behavior remain future work. Do not treat this development bootstrap as production release approval.

## Validation status

The hosted report later confirmed 977 bank MCQs: 12 extra rows had Windows-1252-misdecoded apostrophes. The correct 965 questions remained present. `supabase/repair-catalogue-encoding.sql` is a development-only, content-guarded cleanup for the reviewed snapshot. It was tested locally for correct cleanup, repeatability and rejection of changed rows. It has not been applied remotely by the agent. Do not rerun the full seed to fix these duplicates.

When copying SQL from PowerShell, specify UTF-8 explicitly:

```powershell
Get-Content -Raw -Encoding UTF8 'C:\Projects\sepm-project\supabase\seed.sql' | Set-Clipboard
```

Older Windows PowerShell can decode UTF-8 files without a BOM using the Windows code page. That produces different stored text and defeats exact-question duplicate checks. The cleanup SQL is ASCII-only to avoid this issue while copying it.

Local seed checks verified unique problem-title mapping, 193 five-question sets, four options per question, and answer indexes in range. The complete schema, seed twice (stable counts), and isolation test passed in disposable PGlite PostgreSQL with a simulated Supabase auth.uid() function. Reproduce with `node scripts/validate-database.mjs <installed-pglite-package-directory>`. This does not establish hosted Supabase behavior: hosted SQL execution and real two-account tests remain pending. The alternative API seed passed offline data checks but has not been run remotely by the agent. No production user data is included.
