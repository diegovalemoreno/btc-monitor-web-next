export default function AnaliseTaticaLoading() {
  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg)' }}>
      <div style={{ height: '52px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--nav-bg)' }} />
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: '36px' }}>
          <div className="skeleton" style={{ height: '80px', borderRadius: '8px' }} />
          <div style={{ height: '1px', background: 'var(--border)', marginTop: '16px' }} />
        </div>
        <div className="skeleton" style={{ height: '130px', marginBottom: '24px' }} />
        <div className="grid-4" style={{ marginBottom: '24px' }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: '88px' }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: '260px', marginBottom: '24px' }} />
      </main>
    </div>
  )
}
