import type { Metadata } from 'next'
import './globals.css'
import Nav              from '@/components/nav/Nav'
import AuthGate         from '@/components/auth/AuthGate'
import ErrorBoundary    from '@/components/system/ErrorBoundary'
import HealthMonitor    from '@/components/system/HealthMonitor'
import GlobalDataLoader from '@/components/ui/GlobalDataLoader'
import ParticleBackground from '@/components/ui/ParticleBackground'
import ToastContainer       from '@/components/ui/Toast'
import SystemStatusFooter   from '@/components/ui/SystemStatusFooter'
import { PULSE_CSS }        from '@/lib/chartTheme'

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
            <main
              id="nexus-main"
              style={{
                paddingLeft:     'var(--sidebar-width, 220px)',
                paddingBottom:   '32px',
                minHeight:       '100vh',
                position:        'relative',
                zIndex:          1,
                transition:      'padding-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {children}
            </main>
          </ErrorBoundary>
          <HealthMonitor />
          <ToastContainer />
          <SystemStatusFooter />
        </AuthGate>
      </body>
    </html>
  )
}
