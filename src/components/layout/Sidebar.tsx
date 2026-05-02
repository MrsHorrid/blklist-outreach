'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { motion } from 'framer-motion'

// ── SVG Icons ─────────────────────────────────────────────────────────────────

function IconDashboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

function IconLeads() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="4" />
      <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
      <path d="M19 8v6M16 11h6" />
    </svg>
  )
}

function IconDiscover() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      <path d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  )
}

function IconPipeline() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="5" height="18" rx="1" />
      <rect x="10" y="7" width="5" height="14" rx="1" />
      <rect x="17" y="11" width="5" height="10" rx="1" />
    </svg>
  )
}

function IconAnalytics() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 16l4-4 4 4 5-5" />
    </svg>
  )
}

function IconProfile() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

function IconTeam() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="3.5" />
      <circle cx="17" cy="7" r="3.5" />
      <path d="M2 20c0-3.3 3.1-6 7-6 1.2 0 2.4.3 3.4.8" />
      <path d="M13 20c0-3.3 2.7-6 6-6" />
    </svg>
  )
}

function IconSignOut() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

// ── Nav config ────────────────────────────────────────────────────────────────

const nav = [
  { href: '/', label: 'Dashboard', Icon: IconDashboard, exact: true },
  { href: '/leads', label: 'Leads', Icon: IconLeads },
  { href: '/leads/discover', label: 'Discover', Icon: IconDiscover },
  { href: '/pipeline', label: 'Pipeline', Icon: IconPipeline },
  { href: '/analytics', label: 'Analytics', Icon: IconAnalytics },
]

const settingsNav = [
  { href: '/settings/profile', label: 'Profile', Icon: IconProfile },
  { href: '/settings/team', label: 'Team', Icon: IconTeam },
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

  const NavLink = ({ href, label, Icon, exact }: { href: string; label: string; Icon: React.FC; exact?: boolean }) => {
    const active = isActive(href, exact)
    return (
      <Link
        href={href}
        onClick={onClose}
        className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group ${
          active
            ? 'text-white bg-white/10'
            : 'text-white/40 hover:text-white/75 hover:bg-white/5'
        }`}
      >
        {active && (
          <motion.div
            layoutId="sidebar-indicator"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-400 rounded-full"
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
        <span className={`transition-colors duration-150 ${active ? 'text-indigo-400' : 'text-white/30 group-hover:text-white/60'}`}>
          <Icon />
        </span>
        {label}
      </Link>
    )
  }

  const content = (
    <aside className="flex flex-col w-[220px] min-w-[220px] h-screen bg-[#0a0a0f] border-r border-white/[0.06]">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-[11px] font-bold shadow-lg shadow-indigo-500/20">
            BL
          </div>
          <div>
            <div className="text-white text-sm font-semibold leading-none tracking-wide">BLKLIST</div>
            <div className="text-white/25 text-[10px] mt-0.5 tracking-wider">OUTREACH ENGINE</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="md:hidden text-white/30 hover:text-white/60 transition-colors p-1"
          aria-label="Close menu"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, Icon, exact }) => (
          <NavLink key={href} href={href} label={label} Icon={Icon} exact={exact} />
        ))}

        <div className="pt-5 pb-1">
          <div className="px-3 text-[9px] font-bold uppercase tracking-[0.12em] text-white/20 mb-1.5">Settings</div>
          {settingsNav.map(({ href, label, Icon }) => (
            <NavLink key={href} href={href} label={label} Icon={Icon} />
          ))}
        </div>
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-white/[0.06]">
        {session?.user ? (
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg group">
            <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 text-[11px] font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white/70 text-xs font-medium truncate leading-none">
                {session.user.name || session.user.email}
              </div>
              {session.user.name && (
                <div className="text-white/25 text-[10px] truncate mt-0.5">{session.user.email}</div>
              )}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Sign out"
              className="text-white/20 hover:text-white/60 transition-colors shrink-0"
            >
              <IconSignOut />
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
          transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {content}
      </div>
    </>
  )
}
