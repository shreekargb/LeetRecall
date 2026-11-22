# Returning to study after login

Opening a protected review, pattern or review-list page while signed out now preserves its destination in the login URL. Successful login returns there, including review-list pagination. Already-signed-in users visiting a login link also return to its destination. Unknown pages and external redirect destinations fall back to the homepage.

The shared navigation helper restricts destinations to known study routes. Server page checks also preserve the destination if the session expires between the request guard and page rendering. The request guard retains refreshed/cleared authentication cookies when issuing a redirect.

The login form catches connection failures, permits retries, prevents duplicate in-flight submissions, supports password-manager autocomplete and show/hide password, and announces errors accessibly. Signup with an immediate session continues directly; signup requiring confirmation asks the user to return to the original tab after confirming. Password recovery and a dedicated email-confirmation callback are still future work.

The installed Next.js guide deprecates middleware.ts in favor of proxy.ts. The request guard was renamed accordingly. Restart the local development server after this change.

## Review locally

No new SQL migration or Supabase configuration is needed for this slice. Earlier pending database migrations are still required for their respective features.

1. Restart `npm run dev`. Sign out and open a known `/review/ID` URL. Log in: the same review should open.
2. Repeat with `/patterns/ID` and `/due?page=2` (use a page that exists for this account).
3. Open `/login?next=https://example.com` and sign in. It must return to this app's homepage, never the external site.
4. Enter incorrect credentials, then correct them. Confirm retry succeeds. Test offline submission and recovery; credentials should remain editable after the request fails.
5. Check show/hide password, keyboard navigation and password-manager fill.
6. Check signup both with email confirmation enabled and, in a dedicated development configuration, with an immediate session. No configuration changes were made by the agent.

Automated navigation tests run with `npm run test:auth`. These cover protected-route round trips, pagination, external/malformed redirect rejection and public-route behavior. They do not replace hosted sign-in, signup or browser testing. Production build remains unverified due to the previously blocked font download.
