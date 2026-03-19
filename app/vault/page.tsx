import SavedArticles from '@/components/vault/SavedArticles'

export default function VaultPage() {
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '18px 16px 40px' }}>
      <div style={{ fontSize: '18px', fontWeight: 900 }}>🗂 VAULT</div>
      <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px', marginBottom: '16px' }}>Bookmarked articles</div>
      <SavedArticles />
    </div>
  )
}
