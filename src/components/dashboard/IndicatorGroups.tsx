import type { TacticalSignal, IndicatorGroup } from '@lib/shared/types/signal'
import Tooltip from '@/components/shared/Tooltip'

const GROUP_COLOR: Record<string, string> = {
  sentiment:   '#e08a3a',
  derivatives: '#FF6D00',
  onchain:     '#00C853',
  trend:       '#00BCD4',
  macro:       '#b0a090',
  synthesis:   '#FFD600',
}

const GROUP_TOOLTIP: Record<string, string> = {
  sentiment:   'Agrega Fear & Greed, Long/Short Ratio e BTC Dominância.\n\nFavorável = medo elevado + shorts dominantes + Bitcoin liderando o mercado.\nAlerta = euforia + longs dominantes + altcoins em destaque.\n\nSentimento é contrário por natureza — extremos costumam ser sinais de reversão.',
  derivatives: 'Agrega Funding Rate, Open Interest, Liquidações e Stablecoin Ratio.\n\nFavorável = funding negativo + OI em queda + longs liquidados + stablecoins aguardando entrada.\nAlerta = funding muito alto + OI crescendo + mercado sobreaquecido.\n\nDerivativos refletem alavancagem acumulada — principal fator de risco de curto prazo.',
  onchain:     'Agrega MVRV, Preço Realizado, Hash Ribbon, Pressão de Venda e ETF Institucional.\n\nFavorável = MVRV baixo + preço próximo do realizado + mineradores se recuperando + instituições comprando.\nAlerta = MVRV em zona de euforia + whales distribuindo.\n\nOn-chain revela o comportamento real dos holders de longo prazo — o dado mais difícil de falsificar.',
  trend:       'Agrega Médias Móveis, Variação 7d, Bollinger %B, Mayer Multiple e Pi Cycle Top.\n\nFavorável = preço abaixo das médias históricas + Mayer < 0,8 + Bollinger em oversold.\nAlerta = preço muito acima das médias + Mayer > 2,4 + Pi Cycle próximo do cruzamento histórico.\n\nTendência mostra a saúde estrutural do movimento — contexto de onde o preço está no ciclo.',
  macro:       'Influências externas como dólar (DXY), taxa de juros e fluxos de capital global.\n\nDXY caindo = dólar enfraquecendo = ambiente favorável para Bitcoin.\nDXY subindo forte = pressão sobre ativos de risco.',
  synthesis:   'Confluência de múltiplos indicadores extremos ao mesmo tempo.\n\nQuando vários indicadores batem limites históricos juntos, o sinal de compra é muito mais confiável do que qualquer indicador isolado.',
}

const INDICATOR_TOOLTIP: Record<string, string> = {
  'Medo & Ganância':   'Mede o sentimento geral do mercado de 0 (pânico total) a 100 (euforia total).\n\nAbaixo de 25 = medo extremo — historicamente bom momento para comprar.\nAcima de 75 = euforia — risco alto de correção.\n\nQuando todos têm medo, pode ser hora de comprar. Quando todos estão eufóricos, cuidado.',
  'Taxa de Funding':   'Taxa paga entre traders de futuros a cada 8 horas.\n\nPositiva e alta (>0,03%) = a maioria está alavancada comprando — mercado sobreaquecido, risco de queda brusca.\nNegativa = maioria apostando na queda — sinal de fundo, possível reversão para cima.',
  'Variação 7d':       'Variação percentual do BTC nos últimos 7 dias.\n\nQuedas fortes (>10% em uma semana) costumam ser bons pontos de entrada para DCA tático.\nNão indica topo ou fundo por si só — funciona melhor em conjunto com outros sinais.',
  'Open Interest':     'Valor total de contratos futuros abertos no mercado.\n\nPreço cai + OI cai forte = traders alavancados sendo liquidados (desalavancagem saudável).\nPreço sobe + OI sobe muito = mercado cada vez mais alavancado = risco aumentado.',
  'Liq. de Longs':     'Volume de posições compradas forçadas a fechar por falta de margem.\n\nLiquidações massivas de longs costumam marcar fundos de curto prazo — o mercado "limpa" posições fracas.\nAlto volume de liquidações + queda de preço = possível exaustão vendedora.',
  'MVRV':              'Market Value to Realized Value — compara o valor de mercado atual com o custo médio de compra de todos os BTCs em circulação.\n\nAbaixo de 1 = a maioria dos holders está no prejuízo = zona de capitulação histórica (raro e excelente para comprar).\nAcima de 6 = maioria com lucro enorme = zona de euforia (topo histórico).',
  'Preço Realizado':   'Preço médio ao qual cada BTC foi movimentado pela última vez — representa o custo médio do mercado.\n\nBTC abaixo do preço realizado = maioria dos holders está no prejuízo = oportunidade histórica muito rara.\nBTC acima = mercado em lucro médio.',
  'Mayer Multiple':    'Preço atual dividido pela média móvel de 200 dias.\n\nAbaixo de 0,8 = BTC extremamente barato em relação à sua própria média histórica (ocorre poucas vezes por ciclo).\nAcima de 2,4 = extremamente caro = zona de topo de ciclo.',
  'Hash Ribbon':       'Compara o poder computacional de mineração dos últimos 30 e 60 dias.\n\nQuando o hashrate cai (mineradores desligando máquinas por prejuízo) e depois volta a subir = capitulação dos mineradores terminou.\nHistoricamente um dos sinais de compra mais confiáveis após períodos de bear market.',
  'Pressão venda':     'Mede a proporção de volume de venda em relação ao de compra nas exchanges.\n\nAlta pressão = grandes carteiras (whales) distribuindo BTC = sinal de cautela.\nBaixa pressão = mercado absorvendo bem, sem grandes vendedores.',
  'Médias Móveis':     'Posição do preço em relação às médias de 200 dias (curto/médio prazo) e 50 semanas (longo prazo).\n\nAbaixo das duas médias = zona historicamente barata, rara em ciclos de alta.\nAcima das duas = mercado aquecido, cuidado com entradas grandes.',
  'ETF Institucional': 'Monitora o volume dos maiores ETFs de Bitcoin: IBIT (BlackRock), FBTC (Fidelity), GBTC (Grayscale) e ARKB.\n\nVolume muito acima da média + ETFs subindo = demanda institucional forte.\nVolume muito acima da média + ETFs caindo = instituições distribuindo.',
  'Pi Cycle Top':      'Indicador técnico que compara médias móveis de longo prazo.\n\nQuando cruzam em certo padrão = sinal histórico de topo de ciclo (aconteceu nos topos de 2013, 2017 e 2021).\nQuanto mais longe do cruzamento, menor o risco de topo iminente.',
  'Bollinger %B':      'Mostra onde o preço está dentro das Bandas de Bollinger (faixa de volatilidade).\n\n0% ou abaixo = preço abaixo da banda inferior = muito vendido, historicamente bom para comprar.\n100% ou acima = preço acima da banda superior = muito comprado, cuidado com entradas.',
  'DXY (Dólar Index)': 'Índice que mede a força do dólar americano contra uma cesta de moedas globais.\n\nDXY subindo = dólar fortalecendo = pressão sobre Bitcoin.\nDXY caindo = dólar enfraquecendo = ambiente favorável para Bitcoin.\n\nCorrelação inversa com BTC — quando o dólar sobe, BTC tende a cair.',
  'Long/Short Ratio':  'Proporção de traders com posições compradas (long) versus vendidas (short).\n\nRatio acima de 1,5 = mercado lotado de apostas na alta = risco elevado.\nRatio abaixo de 0,7 = maioria apostando na queda = possível reversão para cima.\n\nMercados com todos do mesmo lado costumam surpreender na direção oposta.',
  'BTC Dominância':    'Percentual do Bitcoin no valor total de todo o mercado de criptomoedas.\n\nAcima de 60% = Bitcoin lidera o mercado, bom contexto para acumular.\nAbaixo de 45% = altcoins em destaque, fase tardia de ciclo de alta.\nAbaixo de 40% = euforia extrema nas altcoins = possível topo de ciclo.',
  'Stablecoin Ratio':  'Compara o tamanho do mercado de stablecoins (USDT, USDC) com o market cap do Bitcoin.\n\nSSR baixo = muito dinheiro parado em stablecoins esperando para entrar = força compradora disponível.\nSSR alto = pouco combustível disponível para subida.',
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
  const color   = GROUP_COLOR[group.key] ?? '#b0a090'
  const tooltip = GROUP_TOOLTIP[group.key]
  return (
    <div style={{ borderBottom: '1px solid rgba(224,138,58,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', width: '120px', flexShrink: 0 }}>
          <span style={{ fontSize: '12px', color: '#b0a090' }}>{group.label}</span>
          {tooltip && <Tooltip text={tooltip} position="right" wide />}
        </div>
        <ScoreBar value={group.score} color={color} />
      </div>
      {group.indicators.length > 0 && (
        <div style={{ paddingLeft: '20px', paddingBottom: '4px' }}>
          {group.indicators.map((ind) => {
            const indTip = INDICATOR_TOOLTIP[ind.name]
            return (
              <div key={ind.name} style={{
                display:      'flex',
                alignItems:   'center',
                gap:          '10px',
                padding:      '4px 0 4px 16px',
                borderLeft:   `2px solid ${color}33`,
                marginLeft:   '8px',
                marginBottom: '2px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '104px', flexShrink: 0 }}>
                  <span style={{ fontSize: '11px', color: '#5a5040' }}>{ind.name}</span>
                  {indTip && <Tooltip text={indTip} position="right" wide />}
                </div>
                <span style={{ fontSize: '11px', color: '#b0a090', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ind.summary}</span>
                <span style={{ fontSize: '11px', color, flexShrink: 0 }}>
                  {ind.score > 0 ? `+${ind.score.toFixed(1)}` : ind.score.toFixed(1)}
                </span>
              </div>
            )
          })}
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
