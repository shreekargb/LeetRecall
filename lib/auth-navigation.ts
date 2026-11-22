// Allow only known study pages. Never navigate to arbitrary URLs supplied by a query string.
export function safeReturnPath(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2048 || /[\\\u0000-\u0020\u007f]/.test(value)) return '/'
  if (!value.startsWith('/') || value.startsWith('//')) return '/'
  const path = value.split(/[?#]/, 1)[0]
  if (!/^(\/|\/due|\/history|\/problems|\/patterns(?:\/[1-9]\d*)?|\/review\/(?:next|[1-9]\d*))$/.test(path)) return '/'
  return value
}

export function loginPath(destination: string) {
  return `/login?next=${encodeURIComponent(safeReturnPath(destination))}`
}

export function confirmationCallbackPath(destination: unknown) {
  return `/auth/callback?next=${encodeURIComponent(safeReturnPath(destination))}`
}

export function usernameOnboardingPath(destination: unknown) {
  return `/welcome?next=${encodeURIComponent(safeReturnPath(destination))}`
}

export function needsUsernameCheck(pathname: string) {
  return pathname === '/' || ['/patterns', '/problems', '/due', '/review', '/history']
    .some(path => pathname === path || pathname.startsWith(`${path}/`))
}

export async function emailConfirmationDestination(
  params: URLSearchParams,
  exchangeCode: (code: string) => Promise<boolean>,
): Promise<string> {
  const next = safeReturnPath(params.get('next'))
  const failure = `/auth/confirmation-error?next=${encodeURIComponent(next)}`
  const code = params.get('code')
  if (params.has('error') || !code || code.length > 4096 || /\s/.test(code)
    || params.getAll('code').length !== 1) return failure
  try {
    return await exchangeCode(code) ? next : failure
  } catch {
    return failure
  }
}

export function authRedirect(pathname: string, search: string, signedIn: boolean): string | null {
  const protectedPage = ['/patterns', '/problems', '/due', '/review', '/history'].some(path => pathname === path || pathname.startsWith(`${path}/`))
  if (protectedPage && !signedIn) return loginPath(pathname + search)
  if (pathname === '/login' && signedIn) return safeReturnPath(new URLSearchParams(search).get('next'))
  return null
}
