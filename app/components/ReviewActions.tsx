import Link from 'next/link'

export default function ReviewActions() {
  return <nav aria-label="After this review" className="space-y-3">
    {/* A document navigation rechecks the queue on every click, including after
        client-side submissions. A prefetched redirect could point to old work. */}
    {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Revalidate queue on every document navigation after saving. */}
    <a href="/review/next" className="block rounded-xl bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-indigo-500">
      Continue to next review →
    </a>
    <div className="flex flex-wrap justify-center gap-5 text-sm text-indigo-300">
      <Link href="/due">Back to reviews</Link>
      <Link href="/history">Review history</Link>
    </div>
    <p className="text-center text-xs text-gray-400">Your work is saved. You can stop here and return later.</p>
  </nav>
}
