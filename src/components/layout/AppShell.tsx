'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Sidebar } from './Sidebar'

const FULLSCREEN_PATHS = ['/login', '/signup', '/invite', '/onboarding']

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  const fullscreen = FULLSCREEN_PATHS.some(p => pathname.startsWith(p))

  if (fullscreen) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-line bg-surface md:hidden shrink-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 -ml-1.5 rounded-md text-muted hover:bg-subtle"
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[var(--sidebar)] flex items-center justify-center text-white text-[10px] font-bold">
              BL
            </div>
            <span className="font-semibold text-[13px] text-ink tracking-tight">BLKLIST</span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto bg-canvas">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="min-h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
