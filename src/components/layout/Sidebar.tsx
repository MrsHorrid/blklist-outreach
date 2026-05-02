'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { motion } from 'framer-motion'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

// ── Icons (1.5 stroke, 18px, consistent family) ──────────────────────────────

const stroke = { stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' }

const I = {
  Home: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
      <path d="M3 11l9-8 9 8M5 9.5V20a1 1 0 001 1h4v-7h4v7h4a1 1 0 001-1V9.5" />
    </svg>
  ),
  Leads: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15.5 14.5c2.5 0 5 1.5 5 4" />
    </svg>
  ),
  Discover: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
      <path d="M12 2.5l2.4 5.4 5.6.6-4.2 3.9 1.1 5.6L12 15.4l-4.9 2.6 1.1-5.6L4 8.5l5.6-.6L12 2.5z" />
    </svg>
  ),
  Pipeline: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
      <rect x="3" y="4" width="5" height="16" rx="1.5" />
      <rect x="10" y="4" width="5" height="11" rx="1.5" />
      <rect x="17" y="4" width="4" height="7" rx="1.5" />
    </svg>
  ),
  Sequences: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
      <path d="M4 6h16M4 10h10M4 14h13M4 18h7" />
      <circle cx="20" cy="17" r="3" />
      <path d="M20 15.5v1.5l1 1" />
    </svg>
  ),
  Analytics: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
      <path d="M3 3v17a1 1 0 001 1h17" />
      <path d="M7 14l3.5-3.5L13 13l5-5" />
    </svg>
  ),
  Profile: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.5 3-6.5 7-6.5s7 3 7 6.5" />
    </svg>
  ),
  Team: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
      <circle cx="9" cy="8.5" r="3" />
      <circle cx="16.5" cy="9" r="2.5" />
      <path d="M3 19c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5" />
      <path d="M14.5 19c0-2.5 2-4.5 4.5-4.5" />
    </svg>
  ),
  Mail: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 8l9 6 9-6" />
    </svg>
  ),
  Logout: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" {...stroke}>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <path d="M16 17l5-5-5-5M21 12H10" />
    </svg>
  ),
  Close: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" {...stroke}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
}

const nav = [
  { href: '/', label: 'Home', Icon: I.Home, exact: true },
  { href: '/leads', label: 'Leads', Icon: I.Leads },
  { href: '/leads/discover', label: 'Discover', Icon: I.Discover },
  { href: '/sequences', label: 'Sequences', Icon: I.Sequences },
  { href: '/pipeline', label: 'Pipeline', Icon: I.Pipeline },
  { href: '/analytics', label: 'Analytics', Icon: I.Analytics },
]

const settingsNav = [
  { href: '/settings/profile', label: 'Profile', Icon: I.Profile },
  { href: '/settings/email-template', label: 'Email template', Icon: I.Mail },
  { href: '/settings/team', label: 'Team', Icon: I.Team },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const path = usePathname()
  const { data: session } = useSession()

  if (path.startsWith('/login') || path.startsWith('/signup') || path.startsWith('/invite')) return null

  const initials = session?.user?.name
    ? session.user.name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()
    : session?.user?.email?.[0].toUpperCase() ?? '?'

  const isActive = (href: string, exact?: boolean) =>
    exact ? path === href : path === href || (href !== '/' && path.startsWith(href))

  const NavItem = ({ href, label, Icon, exact }: { href: string; label: string; Icon: () => React.ReactElement; exact?: boolean }) => {
    const active = isActive(href, exact)
    return (
      <Link
        href={href}
        onClick={onClose}
        className="relative flex items-center gap-3 px-3 h-9 rounded-lg text-[13px] font-medium group"
      >
        {active && (
          <motion.span
            layoutId="sidebar-active"
            transition={{ type: 'spring', stiffness: 500, damping: 38 }}
            className="absolute inset-0 rounded-lg bg-white/[0.07]"
          />
        )}
        <span className={`relative shrink-0 transition-colors ${active ? 'text-white' : 'text-white/40 group-hover:text-white/70'}`}>
          <Icon />
        </span>
        <span className={`relative transition-colors ${active ? 'text-white' : 'text-white/55 group-hover:text-white/85'}`}>
          {label}
        </span>
      </Link>
    )
  }

  const content = (
    <aside className="flex flex-col w-[232px] min-w-[232px] h-screen bg-[var(--sidebar)]">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 flex items-center justify-between">
        <Link href="/" onClick={onClose} className="flex items-center gap-2.5 group">
          <div className="relative w-7 h-7 rounded-lg bg-white flex items-center justify-center text-[var(--sidebar)] text-[11px] font-bold tracking-tight transition-transform duration-200 group-hover:scale-105">
            BL
          </div>
          <div className="text-white text-[13px] font-semibold tracking-tight">BLKLIST</div>
        </Link>
        <button
          onClick={onClose}
          className="md:hidden text-white/30 hover:text-white/70 transition-colors p-1"
          aria-label="Close menu"
        >
          <I.Close />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        <div className="space-y-0.5">
          {nav.map((item) => <NavItem key={item.href} {...item} />)}
        </div>

        <div className="mt-6 mb-1 px-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/25">
            Settings
          </div>
        </div>
        <div className="space-y-0.5">
          {settingsNav.map((item) => <NavItem key={item.href} {...item} />)}
        </div>
      </nav>

      {/* Theme toggle */}
      <div className="px-5 py-2.5 border-t border-[var(--sidebar-line)] flex items-center justify-between">
        <span className="text-[11.5px] font-medium text-white/45 tracking-tight">Appearance</span>
        <ThemeToggle />
      </div>

      {/* User */}
      <div className="p-3 border-t border-[var(--sidebar-line)]">
        {session?.user ? (
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg group">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-[11px] font-semibold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white/85 text-[12.5px] font-medium truncate leading-tight">
                {session.user.name || session.user.email}
              </div>
              {session.user.name && (
                <div className="text-white/35 text-[11px] truncate leading-tight mt-0.5">
                  {session.user.email}
                </div>
              )}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Sign out"
              className="text-white/30 hover:text-white/80 transition-colors shrink-0 p-1.5 rounded-md hover:bg-white/5"
            >
              <I.Logout />
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  )

  return (
    <>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      <div
        className={`
          fixed md:relative top-0 left-0 z-50 md:z-auto h-full
          transition-transform duration-200 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {content}
      </div>
    </>
  )
}
