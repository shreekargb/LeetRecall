# Check changes before committing

From the project folder, run:

```powershell
npm run verify
```

This runs TypeScript, ESLint and all `scripts/*.test.mjs` files in order. It stops with a nonzero exit code if a check fails. Newly added unit test files are included automatically. The command uses local dependencies, does not install packages, and does not apply SQL or reset data. Run `npm ci` first on a fresh clone.

Wait for **Local verification passed** before treating these automated checks as successful. A passing result covers only these checks; it is not proof that the whole application is production-ready.

## Separate release checks

- Run `npm run build` to verify the production build. The previous build was blocked fetching Google fonts; this remains a separate unresolved verification step.
- Run the documented SQL regressions and verify the actual development database. Unit tests do not prove hosted row-level security or function behavior.
- Test the browser journey with two accounts: solve, review schedule, quizzes, explanations, saved results, draft recovery and account isolation.
- Review mobile and keyboard behavior, and test page error recovery using ERROR-RECOVERY.md.
- Review staged changes for secrets and private exports before committing. A passing test command does not replace that review.
