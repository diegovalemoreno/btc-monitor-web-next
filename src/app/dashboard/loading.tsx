export default function DashboardLoading() {
  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg)' }}>
      {/* nav skeleton */}
      <div style={{ height: '52px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--nav-bg)' }} />

      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 24px' }}>
        {/* regime card */}
        <div className="skeleton" style={{ height: '130px', marginBottom: '24px' }} />

        {/* dimension scores */}
        <div className="grid-4" style={{ marginBottom: '24px' }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: '88px' }} />
          ))}
        </div>

        {/* indicator groups */}
        <div className="skeleton" style={{ height: '260px', marginBottom: '24px' }} />
      </main>
    </div>
  )
}
