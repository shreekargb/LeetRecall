import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { authRedirect, needsUsernameCheck, usernameOnboardingPath } from './lib/auth-navigation'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — required for Server Components to pick up updated session
  const { data: { user } } = await supabase.auth.getUser()

  let destination = authRedirect(request.nextUrl.pathname, request.nextUrl.search, Boolean(user))
  if (user && !destination && needsUsernameCheck(request.nextUrl.pathname)) {
    const { data: profile, error } = await supabase.from('profiles').select('username')
      .eq('user_id', user.id).maybeSingle()
    // On read failures, welcome displays recovery guidance instead of assuming a new account.
    if (error || !profile) destination = usernameOnboardingPath(request.nextUrl.pathname + request.nextUrl.search)
  }
  if (destination) {
    const response = NextResponse.redirect(new URL(destination, request.url))
    // Refresh/clear cookies must survive redirects as well as normal responses.
    for (const cookie of supabaseResponse.cookies.getAll()) response.cookies.set(cookie)
    return response
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
