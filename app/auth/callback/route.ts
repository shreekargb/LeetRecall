import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { emailConfirmationDestination, usernameOnboardingPath } from '@/lib/auth-navigation'

export async function GET(request: NextRequest) {
  // Keep cookie updates on this same response when changing its destination.
  const response = NextResponse.redirect(new URL('/auth/confirmation-error', request.url))
  response.headers.set('Cache-Control', 'no-store')
  response.headers.set('Referrer-Policy', 'no-referrer')
  const destination = await emailConfirmationDestination(request.nextUrl.searchParams, async code => {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: cookies => {
            for (const { name, value, options } of cookies) {
              request.cookies.set(name, value)
              response.cookies.set(name, value, options)
            }
          },
        },
      },
    )
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    return !error && Boolean(data.session)
  })
  const target = destination.startsWith('/auth/confirmation-error?') ? destination : usernameOnboardingPath(destination)
  response.headers.set('Location', new URL(target, request.url).toString())
  return response
}
