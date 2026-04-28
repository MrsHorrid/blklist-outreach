'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const nav = [
  { href: '/leads', label: 'Leads', icon: '◈' },
  { href: '/leads/discover', label: 'Discover', icon: '⊕' },
  { href: '/pipeline', label: 'Pipeline', icon: '⊞' },
  { href: '/analytics', label: 'Analytics', icon: '◎' },
]

export function Sidebar() {
  const path = usePathname()

  return (
    <aside className="flex flex-col w-[220px] min-w-[220px] h-screen bg-[#0f0f0f] border-r border-white/5">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
            BL
          </div>
          <div>
            <div className="text-white text-sm font-semibold leading-none">BLKLIST</div>
            <div className="text-white/30 text-[10px] mt-0.5">Outreach Engine</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ href, label, icon }) => {
          const active = path === href || (href !== '/leads' && path.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/5'
              }`}
            >
              <span className="text-base leading-none">{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-5 py-4 border-t border-white/5">
        <div className="text-white/20 text-[10px] leading-relaxed">
          <div className="font-medium text-white/30 mb-1">BLKLIST</div>
          30%+ CTR · Adidas · Nike<br />
          Disney+ · Google-backed
        </div>
      </div>
    </aside>
  )
}
