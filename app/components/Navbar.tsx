import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / App name */}
          <Link
            href="/"
            className="flex items-center gap-2 text-white font-bold text-xl tracking-tight hover:text-indigo-400 transition-colors"
          >
            <span className="text-indigo-400">⚡</span>
            DSA Recall
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            <Link
              href="/patterns"
              className="text-gray-300 hover:text-white hover:bg-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Patterns
            </Link>
            <Link
              href="/due"
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <span>Due Today</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
