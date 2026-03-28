import type { Metadata } from 'next'
import DeveloperFieldManual from '@/components/resources/DeveloperFieldManual'

export const metadata: Metadata = {
  title: 'Field manual | Nexus Prime',
  description:
    'Curated external resources: Claude architect prep, AI engineering interviews, maths/CS compendium, Cursor BYOK bridge, Codex plugins, and research skills.',
}

export default function ResourcesPage() {
  return (
    <div
      style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '20px 16px 48px',
      }}
    >
      <header style={{ marginBottom: '22px' }}>
        <h1
          style={{
            fontSize: '20px',
            fontWeight: 900,
            letterSpacing: '0.04em',
            margin: '0 0 6px',
            color: 'var(--text)',
          }}
        >
          Field manual
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--text3)', margin: 0 }}>
          Curated GitHub resources for certification prep, interviews, fundamentals, and agent tooling.
        </p>
      </header>

      <DeveloperFieldManual />
    </div>
  )
}
