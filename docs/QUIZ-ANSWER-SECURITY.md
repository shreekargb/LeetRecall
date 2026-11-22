# Protecting quiz answers

Previously, the app hid answers on the quiz screen, but signed-in users could request `correct_index` and `explanation` directly from the question table. This migration removes that database access. The app now requests only question IDs, text, options and source.

Column permissions control which fields are readable. Existing row-level security still controls whose personalized questions are readable. Both restrictions apply together. Learners can no longer use answer columns in selects, filters or sorting. Database grading retains privileged access and returns answers only as part of a completed submission. Saved results remain visible to their owner. Server AI generation is unchanged.

## Apply in development

1. Confirm all four earlier migrations, including `202611190003_explanations.sql`, have succeeded in development.
2. Open `supabase/migrations/202611190004_protect_quiz_answers.sql`, copy the entire file, and run it in the DEVELOPMENT Supabase SQL Editor. This changes permissions only; it does not delete or reseed data.
3. Run `supabase/tests/quiz-answer-access.sql` in the same editor as postgres. Expect the success message about question fields and denied answer access. Its synthetic records are rolled back.
4. Start the local app with `npm run dev`. Open a due Day 1 quiz, confirm five questions load, submit it, and refresh to confirm saved scores and answer explanations remain available. Check a Day 7 personalized quiz when one is due and confirm account B cannot view account A's saved results.

Do not use the SQL Editor's postgres role to judge learner permissions with an ordinary SELECT: postgres is privileged. The test explicitly switches roles to exercise learner restrictions. Browser and hosted API behavior still require manual verification.

## Scope and validation

The local PostgreSQL validator applies this migration twice and runs answer-access tests plus solve, quiz, explanation and isolation regressions under the resulting permissions. Quiz tests use known synthetic answers instead of reading answer keys as a learner. TypeScript and ESLint check the application change.

This is a learning app, not an exam lockdown system. Previously revealed answers in completed attempts remain readable, and bank questions can be reused in later reviews. This change blocks direct access to the question table's keys; it does not prevent remembering or sharing completed quiz answers. Other security and release checks remain on the roadmap.

No production database changes, commits, pushes or deployments were performed. Full production build verification remains incomplete because of the previously blocked font download.
