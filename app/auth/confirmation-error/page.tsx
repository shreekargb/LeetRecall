import Link from 'next/link'
import { Suspense } from 'react'
import { loginPath, safeReturnPath } from '@/lib/auth-navigation'

async function ConfirmationHelp({ searchParams }: {
  searchParams: Promise<{ next?: string | string[] }>
}) {
  const next = safeReturnPath((await searchParams).next)
  return <main className="mx-auto max-w-xl px-4 py-16">
    <h1 className="text-3xl font-bold">We couldn’t finish signing you in</h1>
    <p role="alert" className="mt-4 text-gray-300">The confirmation link may have expired, already been used, or opened in a different browser. A connection problem can also prevent sign-in.</p>
    <p className="mt-4 text-gray-300">Try logging in with your email and password: your email may already be confirmed. If confirmation is still required, open the latest confirmation email in the same browser and device where you signed up.</p>
    <Link href={loginPath(next)} className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-500">Go to login</Link>
    <Link href="/" className="ml-5 inline-flex min-h-11 items-center text-indigo-300">Return home</Link>
  </main>
}

export default function ConfirmationErrorPage(props: {
  searchParams: Promise<{ next?: string | string[] }>
}) {
  return <Suspense fallback={<p role="status" className="p-8">Loading sign-in help…</p>}>
    <ConfirmationHelp {...props} />
  </Suspense>
}
