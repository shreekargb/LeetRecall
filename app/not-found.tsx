import Link from 'next/link'

export default function NotFound() {
  return <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
    <p className="text-sm font-semibold text-indigo-300">404</p>
    <h1 className="mt-3 text-3xl font-bold text-white">Page not found</h1>
    <p className="mt-4 text-gray-300">This page doesn’t exist or isn’t available to your account. Check the address or choose where to continue.</p>
    <nav aria-label="Find your study pages" className="mt-7 flex flex-wrap gap-4">
      <Link href="/" className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-500">Dashboard</Link>
      <Link href="/problems" className="rounded-lg bg-gray-800 px-5 py-3 text-gray-100 hover:bg-gray-700">Find a problem</Link>
      <Link href="/due" className="rounded-lg bg-gray-800 px-5 py-3 text-gray-100 hover:bg-gray-700">Your reviews</Link>
    </nav>
  </main>
}
