import CVEFeed         from '@/components/cyber/CVEFeed'
import OTXFeed         from '@/components/cyber/OTXFeed'
import CISAFeed        from '@/components/cyber/CISAFeed'
import ThreatIntelFeed from '@/components/cyber/ThreatIntelFeed'
import { CVEsLoader, OTXLoader } from '@/components/ui/DataLoader'

export default function CyberPage() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '18px 16px 40px' }}>
      <CVEsLoader />
      <OTXLoader />

      <div style={{ fontSize: '18px', fontWeight: 900 }}>🔒 CYBER</div>
      <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px', marginBottom: '20px' }}>
        CVE vulnerabilities · CISA KEV catalog · OTX threat pulses · Adversary intelligence
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
