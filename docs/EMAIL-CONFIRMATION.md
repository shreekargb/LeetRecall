# Email confirmation sign-in

Signup now sends a redirect URL to `/auth/callback` on the current app origin, carrying an allowlisted study destination. The callback exchanges Supabase's PKCE code for a session and preserves auth cookies on its redirect response. Missing/rejected/expired codes and connection failures lead to a sign-in help page; raw provider errors and codes are not echoed into the destination. Callback redirects are marked no-store and no-referrer.

## Development configuration

In the DEVELOPMENT Supabase project, check Authentication > URL Configuration. Allow your local app redirect URLs, for example `http://localhost:3000/**` for local development. Add port 3001 separately only if you use it. The Site URL should point to your development app. Keep these settings separate from production; production should use reviewed production redirect URLs.

This flow expects the standard confirmation email link through Supabase (`{{ .ConfirmationURL }}`). A customized token-hash email template that targets another endpoint is not handled by this callback; review such a template before changing it. No provider settings or email templates were edited by the agent.

PKCE requires the browser/device that started signup, because it holds the code verifier. A link opened elsewhere can confirm the email but fail automatic sign-in; the help page offers password login. An expired, unconfirmed email may need a new confirmation email through the provider; resend UI is not part of this slice. Password recovery remains deferred.

## Manual checks

1. With confirmation enabled in DEVELOPMENT, open `/login?next=%2Fproblems` and sign up with a new test email.
2. Confirm the check-email screen appears. Open the latest email link in the same browser/device. Expect a signed-in Problems page; refresh and confirm the session persists.
3. With email confirmation disabled in a suitable test setup, immediate-session signup should still navigate directly to the intended page.
4. Open `/auth/callback` without a code. Expect a clear help page and a working Go to login link.
5. Open `/auth/callback?code=invalid&next=%2Fdue`. Expect help; login should retain the Reviews destination. Do not paste real email links/codes into reports.
6. Test an already-used link, a different-browser link, normal password login and sign-out. Errors must not expose tokens or redirect to external websites.

Automated helper tests cover safe destinations, successful exchange decisions, rejected/thrown exchange failures and malformed codes. Actual email delivery, cookie persistence and hosted-provider settings require manual integration checks.

References: https://supabase.com/docs/guides/auth/sessions/pkce-flow and https://supabase.com/docs/guides/auth/redirect-urls
