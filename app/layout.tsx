import type { Metadata } from 'next'
import './globals.css'
import Nav              from '@/components/nav/Nav'
import AuthGate         from '@/components/auth/AuthGate'
import CommandBar       from '@/components/ui/CommandBar'
import GlobalDataLoader from '@/components/ui/GlobalDataLoader'
import { ArticlesLoader } from '@/components/ui/DataLoader'

export const metadata: Metadata = {
  title: 'Nexus Prime',
  description: 'Personal intelligence dashboard',
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
          <Nav />
          <main style={{ paddingTop: '48px', minHeight: '100vh' }}>
            {children}
          </main>
          {/* Global data — loads articles + keyword alerts on every page */}
          <GlobalDataLoader />
          <ArticlesLoader />
          {/* Global command dock — persists across all tabs */}
          <CommandBar />
        </AuthGate>
      </body>
    </html>
  )
}
