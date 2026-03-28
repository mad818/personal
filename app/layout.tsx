// ── layout ──────────────────────────────────────────────────
// Root layout: global styles, auth gate, navigation, health monitor.

import type { Metadata, Viewport } from 'next'
import './globals.css'
import Nav               from '@/components/nav/Nav'
import AuthGate          from '@/components/auth/AuthGate'
import CommandBar        from '@/components/ui/CommandBar'
import GlobalDataLoader  from '@/components/ui/GlobalDataLoader'
import { ArticlesLoader } from '@/components/ui/DataLoader'
import ProposedEditPanel from '@/components/ui/ProposedEditPanel'
import ChangeLogPanel    from '@/components/ui/ChangeLogPanel'
import CronSchedulerRunner from '@/components/ui/CronSchedulerRunner'
import ErrorBoundary     from '@/components/system/ErrorBoundary'
import ClickDebug        from '@/components/ui/ClickDebug'

export const metadata: Metadata = {
  title: 'Nexus Prime',
  description: 'Personal intelligence dashboard',
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml', sizes: '512x512' }],
    apple: [{ url: '/icon.svg', sizes: '180x180' }],
  },
  appleWebApp: {
    capable: true,
    title: 'Nexus Prime',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0708',
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'dark',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthGate>
          <ErrorBoundary label="RootLayout">
            <Nav />
            <main style={{ paddingTop: '48px', minHeight: '100vh' }}>
              {children}
            </main>
            {/* Global data — loads articles + keyword alerts on every page */}
            <GlobalDataLoader />
            <ArticlesLoader />
            <CronSchedulerRunner />
            {/* Global command dock — persists across all tabs */}
            <CommandBar />
            <ClickDebug />
            {/* Proposed edit overlay — agent proposes, user approves/rejects */}
            <ProposedEditPanel />
            {/* Audit trail — all applied/rejected changes */}
            <ChangeLogPanel />
          </ErrorBoundary>
        </AuthGate>
      </body>
    </html>
  )
}
