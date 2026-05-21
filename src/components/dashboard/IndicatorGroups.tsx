import type { TacticalSignal, IndicatorGroup } from '@lib/shared/types/signal'

const GROUP_COLOR: Record<string, string> = {
  sentiment:   '#e08a3a',
  derivatives: '#FF6D00',
  onchain:     '#00C853',
  trend:       '#00BCD4',
  macro:       '#b0a090',
  synthesis:   '#FFD600',
}

function ScoreBar({ value, color }: { value: number; color: string }) {
  const pct = Math.min(100, Math.max(0, (value + 10) / 20 * 100))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
      <div style={{ flex: 1, background: '#1e1e1e', borderRadius: '3px', height: '4px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '4px', background: color, borderRadius: '3px' }} />
      </div>
      <span style={{ fontSize: '11px', color: '#5a5040', width: '28px', textAlign: 'right', flexShrink: 0 }}>
        {value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1)}
      </span>
    </div>
  )
}

function GroupRow({ group }: { group: IndicatorGroup }) {
  const color = GROUP_COLOR[group.key] ?? '#b0a090'
  return (
    <div style={{ borderBottom: '1px solid rgba(224,138,58,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 20px' }}>
        <span style={{ fontSize: '12px', color: '#b0a090', width: '110px', flexShrink: 0 }}>{group.label}</span>
        <ScoreBar value={group.score} color={color} />
      </div>
      {group.indicators.length > 0 && (
        <div style={{ paddingLeft: '20px', paddingBottom: '4px' }}>
          {group.indicators.map((ind) => (
            <div key={ind.name} style={{
              display:   'flex',
              alignItems: 'center',
              gap:       '12px',
              padding:   '4px 0 4px 16px',
              borderLeft: `2px solid ${color}33`,
              marginLeft: '8px',
              marginBottom: '2px',
            }}>
              <span style={{ fontSize: '11px', color: '#5a5040', width: '100px', flexShrink: 0 }}>{ind.name}</span>
              <span style={{ fontSize: '11px', color: '#b0a090', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ind.summary}</span>
              <span style={{ fontSize: '11px', color, flexShrink: 0 }}>
                {ind.score > 0 ? `+${ind.score.toFixed(1)}` : ind.score.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function IndicatorGroups({ signal }: { signal: TacticalSignal }) {
  if (!signal.indicatorGroups || signal.indicatorGroups.length === 0) return null

  return (
    <div style={{
      background:   '#111111',
      border:       '1px solid rgba(224,138,58,0.1)',
      borderRadius: '12px',
      overflow:     'hidden',
      marginBottom: '24px',
    }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(224,138,58,0.07)' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#5a5040', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Indicadores por dimensão
        </span>
      </div>
      <div>
        {signal.indicatorGroups.map((g) => <GroupRow key={g.key} group={g} />)}
      </div>
    </div>
  )
}
