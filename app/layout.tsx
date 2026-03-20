import type { Metadata } from 'next'
import './globals.css'
import Nav              from '@/components/nav/Nav'
import AuthGate         from '@/components/auth/AuthGate'
import ErrorBoundary    from '@/components/system/ErrorBoundary'
import HealthMonitor    from '@/components/system/HealthMonitor'
import GlobalDataLoader from '@/components/ui/GlobalDataLoader'
import ParticleBackground from '@/components/ui/ParticleBackground'
import { PULSE_CSS }    from '@/lib/chartTheme'

export const metadata: Metadata = {
  title: 'Nexus Prime',
  description: 'Autonomous intelligence, security & automation command center',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: PULSE_CSS }} />
      </head>
      <body>
        <ParticleBackground />
        <AuthGate>
          <Nav />
          <GlobalDataLoader />
          <ErrorBoundary>
            <main style={{ paddingTop: '48px', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
              {children}
            </main>
          </ErrorBoundary>
          <HealthMonitor />
        </AuthGate>
      </body>
    </html>
  )
}
