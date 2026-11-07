import { Suspense } from 'react'
import Link from 'next/link'
import NavbarUserSection from './NavbarUserSection'

function NavbarUserSkeleton() {
  return <div className="h-8 w-24 bg-gray-800 rounded-lg animate-pulse" />
}

export default function Navbar() {
  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link
            href="/"
            className="flex items-center gap-2 text-white font-bold text-xl tracking-tight hover:text-indigo-400 transition-colors"
          >
            <span className="text-indigo-400">⚡</span>
            DSA Recall
          </Link>

          <div className="flex items-center gap-1">
            <Suspense fallback={<NavbarUserSkeleton />}>
              <NavbarUserSection />
            </Suspense>
          </div>
        </div>
      </div>
    </nav>
  )
}
