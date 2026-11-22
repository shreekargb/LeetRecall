# First-sign-in usernames

After signup/session creation or email confirmation, users without a profile choose a unique username on `/welcome`. Existing accounts without a username receive the same one-time prompt; their study data is preserved. After saving, they continue to the intended study page. Users with a profile skip setup. The username appears in desktop and mobile navigation; login continues to use email/password.

Rules: 3–24 ASCII letters, digits or underscores; start with a letter. Surrounding whitespace is trimmed and names are saved in lowercase. A database unique constraint enforces case-insensitive uniqueness through normalization. Names cannot be edited through this first-time setup. No public user directory or username-based login is introduced.

## Enable in development

Run the entire `supabase/migrations/202611220002_usernames.sql` file in the DEVELOPMENT Supabase SQL Editor after the existing migrations. It creates `profiles`, RLS and `choose_username(text)`. It does not delete existing users or study records. Apply once; do not rerun baseline/schema files. Until the migration is installed, signed-in study navigation will lead to a profile-loading error.

The agent has not applied any hosted migration. Deploy the migration before code that requires profiles in any environment.

## Security and behavior

- Profiles reference `auth.users` and are removed when the auth user is deleted.
- Clients can read only their own profile. Direct insert/update/delete is denied.
- The authenticated RPC derives the owner from `auth.uid()`, validates the name and serializes first-time writes for an account. Anonymous execution is denied.
- Same-name retries return the saved name; a second different choice cannot silently rename an account. Different accounts cannot claim the same normalized username.
- Profile state is read from the database, not user-editable auth metadata. A missing profile triggers setup; read failures show recovery instead of claiming the profile is missing.
- Study-page redirects guide onboarding. API authorization remains independently enforced by sessions/RLS; a username is not a security credential.

## Manual verification

1. Sign in with an existing development account with no profile. Expect Choose your username. Your study records remain intact.
2. Submit `ab`, spaces within a name, or punctuation; expect validation feedback.
3. Save a unique name such as `learner_01`. Expect the intended study page and `@learner_01` in navigation. Refresh and sign in again; setup must not repeat.
4. In another account, try `LEARNER_01`; expect a taken-name message. Choose another name and verify account separation.
5. Test new signup with email confirmation, immediate-session signup if enabled, and a direct visit to `/welcome` while signed out.
6. Test mobile navigation, keyboard submission, network failure/retry and the original intended destination, e.g. `/login?next=%2Fdue`.

Local automated tests cover format/normalization, safe redirects, routing exclusions, grants, RLS, duplicate rejection, retries, immutable first choice and account-deletion cleanup. Actual browser/email-cookie integration and hosted checks remain pending. Local SQL fixtures use a minimal auth.users stub; they do not validate hosted Supabase Auth internals.
