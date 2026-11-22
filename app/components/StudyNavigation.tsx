'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from './LogoutButton'

const destinations = [
  { href: '/', label: 'Dashboard' },
  { href: '/problems', label: 'Problems' },
  { href: '/patterns', label: 'Patterns' },
  { href: '/due', label: 'Reviews' },
  { href: '/history', label: 'History' },
]

export default function StudyNavigation() {
  const pathname = usePathname()
  function links() {
    return destinations.map(({ href, label }) => {
      const active = pathname === href || (href !== '/' && pathname.startsWith(`${href}/`))
      return <Link key={href} href={href} aria-current={active ? 'page' : undefined}
        className={`flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium ${active
          ? 'bg-indigo-900 text-indigo-100' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
        {label}
      </Link>
    })
  }
  return <>
    <div className="hidden items-center gap-1 lg:flex">{links()}<LogoutButton /></div>
    <details key={pathname} className="group lg:hidden"
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false
      }}
      onKeyDown={event => {
        if (event.key === 'Escape' && event.currentTarget.open) {
          event.preventDefault()
          event.currentTarget.open = false
          event.currentTarget.querySelector('summary')?.focus()
        }
      }}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-100 hover:bg-gray-800 [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">Menu</span><span className="hidden group-open:inline">Close menu</span>
        <span aria-hidden="true">☰</span>
      </summary>
      <div className="absolute inset-x-0 top-full max-h-[calc(100dvh-5rem)] overflow-y-auto border-b border-gray-700 bg-gray-900 p-4 shadow-xl"
        onClick={event => {
          if ((event.target as HTMLElement).closest('a')) {
            const details = event.currentTarget.closest('details')
            if (details) details.open = false
          }
        }}>
        <div className="mx-auto grid max-w-6xl gap-1">{links()}<LogoutButton /></div>
      </div>
    </details>
  </>
}
