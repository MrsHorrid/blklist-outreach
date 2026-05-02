'use client'

import { motion } from 'framer-motion'
import { useTheme } from './ThemeProvider'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="relative w-12 h-6 rounded-full bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] transition-colors flex items-center px-0.5"
    >
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 600, damping: 38 }}
        className={`w-5 h-5 rounded-full flex items-center justify-center ${isDark ? 'ml-auto bg-zinc-200' : 'mr-auto bg-amber-300'}`}
      >
        {isDark ? <MoonIcon /> : <SunIcon />}
      </motion.div>
    </button>
  )
}

function SunIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#a16207" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3f3f46" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}
