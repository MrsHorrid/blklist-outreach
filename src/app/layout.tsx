import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { AppShell } from '@/components/layout/AppShell'
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider, ThemeScript } from '@/components/theme/ThemeProvider'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: 'BLKLIST Outreach',
  description: 'AI-powered B2B outreach CRM',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="bg-canvas">
        <ThemeProvider>
          <SessionProvider>
            <AppShell>
              {children}
            </AppShell>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
