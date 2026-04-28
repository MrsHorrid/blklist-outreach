'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'

const AUTH_PATHS = ['/login', '/signup']

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const isAuth = AUTH_PATHS.some(p => path.startsWith(p))

  if (isAuth) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        {children}
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
    </div>
  )
}
