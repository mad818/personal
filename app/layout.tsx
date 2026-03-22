import type { Metadata } from 'next'
import './globals.css'
import Nav           from '@/components/nav/Nav'
import AuthGate      from '@/components/auth/AuthGate'
import AgentStatusBar from '@/components/ui/AgentStatusBar'

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
          {/* Global agent presence — persists across all tabs */}
          <AgentStatusBar />
        </AuthGate>
      </body>
    </html>
  )
}
