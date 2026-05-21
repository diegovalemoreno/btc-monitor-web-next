import type { SnapshotScores } from '@/domain/snapshot-scores'
import Tooltip from '@/components/shared/Tooltip'

interface DimCard {
  key:     keyof SnapshotScores
  label:   string
  color:   string
  tooltip: string
}

const DIMS: DimCard[] = [
  {
    key:   'opportunityScore',
    label: 'Oportunidade',
    color: '#00C853',
    tooltip: 'Quanto o mercado está favorável para comprar Bitcoin agora.\n\nQuanto maior, melhor o momento para aportar.\nQuanto menor, mais prudente é esperar ou reduzir o aporte.',
  },
  {
    key:   'riskScore',
    label: 'Risco',
    color: '#FF6D00',
    tooltip: 'Nível de perigo atual do mercado.\n\nAbaixo de 40 = risco baixo, bom para acumular.\nAcima de 75 = risco elevado, vale ser cauteloso e reduzir ou pausar aportes.',
  },
  {
    key:   'convictionScore',
    label: 'Convicção',
    color: '#e08a3a',
    tooltip: 'Quanto os dados técnicos e on-chain confirmam a tendência atual.\n\nAlta convicção = vários indicadores apontando na mesma direção = sinal mais confiável.\nBaixa convicção = sinais mistos, melhor manter cautela.',
  },
  {
    key:   'euphoriaScore',
    label: 'Euforia',
    color: '#FF1744',
    tooltip: 'Grau de otimismo excessivo do mercado.\n\nQuando muito alto, o preço pode estar inflado e próximo de uma correção.\nHistoricamente, comprar quando a euforia está baixa traz melhores resultados.',
  },
]

function arc(pct: number, color: string) {
  const r    = 22
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="#1e1e1e" strokeWidth="5" />
      <circle
        cx="28" cy="28" r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 28 28)"
      />
    </svg>
  )
}

export default function DimensionScores({ scores }: { scores: SnapshotScores }) {
  return (
    <div className="grid-4" style={{ marginBottom: '24px' }}>
      {DIMS.map(({ key, label, color, tooltip }) => {
        const val = Math.round(scores[key] ?? 0)
        return (
          <div key={key} style={{
            background:    '#111111',
            border:        '1px solid rgba(224,138,58,0.1)',
            borderRadius:  '10px',
            padding:       '16px',
            display:       'flex',
            flexDirection: 'column',
            alignItems:    'center',
            gap:           '8px',
          }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {arc(val, color)}
              <span style={{ position: 'absolute', fontSize: '12px', fontWeight: 700, color }}>{val}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#b0a090', textAlign: 'center' }}>{label}</span>
              <Tooltip text={tooltip} position="bottom" />
            </div>
          </div>
        )
      })}
    </div>
  )
}
