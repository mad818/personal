'use client'

import CVEFeed              from '@/components/cyber/CVEFeed'
import OTXFeed              from '@/components/cyber/OTXFeed'
import CISAFeed             from '@/components/cyber/CISAFeed'
import ThreatIntelFeed      from '@/components/cyber/ThreatIntelFeed'
import ThreatSeverityDonut  from '@/components/cyber/ThreatSeverityDonut'
import AttackVectorChart    from '@/components/cyber/AttackVectorChart'
import { CVEsLoader, OTXLoader } from '@/components/ui/DataLoader'
import PageTransition       from '@/components/ui/PageTransition'
import DataLoadingState     from '@/components/ui/DataLoadingState'
import { useStore }         from '@/store/useStore'

function CyberContent() {
  const cves       = useStore((s) => s.cves)
  const cvesLoaded = useStore((s) => s.cvesLoaded)
  const otxPulses  = useStore((s) => s.otxPulses)
  const threatIntel = useStore((s) => s.threatIntel)

  const hasData = cves.length > 0 || otxPulses.length > 0 ||
    threatIntel.threatfox.length > 0 || threatIntel.shodan !== null

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '18px 16px 40px' }}>
      <CVEsLoader />
      <OTXLoader />

      <div style={{ fontSize: '18px', fontWeight: 900 }}>🔒 CYBER</div>
      <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px', marginBottom: '20px' }}>
        CVE vulnerabilities · CISA KEV catalog · OTX threat pulses · Adversary intelligence
      </div>

      {/* Show loading if no data yet */}
      {!hasData && !cvesLoaded && (
        <DataLoadingState dataName="threat intelligence" height={120} />
      )}

      {/* New visualization row: Threat Severity Donut + Attack Vector Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <ThreatSeverityDonut />
        <AttackVectorChart />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Left — NVD CVEs */}
        <div>
          <div style={{
            fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase',
            letterSpacing: '0.8px', marginBottom: '10px',
          }}>
            NVD Vulnerabilities
          </div>
          <CVEFeed />
        </div>

        {/* Right — OTX Pulses */}
        <div>
          <div style={{
            fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase',
            letterSpacing: '0.8px', marginBottom: '10px',
          }}>
            AlienVault OTX · Threat Pulses
          </div>
          <OTXFeed />
        </div>

      </div>

      {/* CISA KEV — full width below the two-column grid */}
      <div style={{ marginTop: '20px' }}>
        <div style={{
          fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase',
          letterSpacing: '0.8px', marginBottom: '10px',
        }}>
          CISA Known Exploited Vulnerabilities (KEV)
        </div>
        <CISAFeed />
      </div>

      {/* ThreatFox IOC Intelligence */}
      <div style={{ marginTop: '20px' }}>
        <div style={{
          fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase',
          letterSpacing: '0.8px', marginBottom: '10px',
        }}>
          ThreatFox IOC Intelligence
        </div>
        <ThreatIntelFeed />
      </div>

    </div>
  )
}

export default function CyberPage() {
  return (
    <PageTransition>
      <CyberContent />
    </PageTransition>
  )
}
