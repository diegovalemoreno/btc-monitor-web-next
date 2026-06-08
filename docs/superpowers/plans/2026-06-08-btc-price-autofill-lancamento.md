# BTC Price Auto-fill no Lançamento — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ao selecionar data e hora no form de lançamento, buscar automaticamente o preço BTC/BRL da Binance e pré-preencher o campo "Cotação do mercado", mantendo override manual.

**Architecture:** Nova rota `GET /api/btc-price-at?ts=` chama Binance ticker (preço recente) ou Binance klines 1h (preço histórico). Ambos os modais de lançamento (`RegisterContributionModal` e `EditContributionModal`) ganham campo de hora e `useEffect` com debounce 500ms que dispara o fetch ao mudar data/hora.

**Tech Stack:** Next.js App Router API routes, React `useState`/`useEffect`, Binance REST API pública (sem autenticação).

**Spec:** `docs/superpowers/specs/2026-06-08-btc-price-autofill-lancamento-design.md`

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/app/api/btc-price-at/route.ts` | Criar | Lookup de preço BTC/BRL na Binance por timestamp |
| `src/components/dca-tactical/DcaContributionHistory.tsx` | Editar (linhas 641, 649–656, 728–739, JSX dos modais) | Adicionar campo hora + auto-fetch ao RegisterModal e EditModal |

---

## Task 1: Criar rota `GET /api/btc-price-at`

**Files:**
- Create: `src/app/api/btc-price-at/route.ts`

- [ ] **Step 1: Criar o arquivo da rota**

```typescript
// src/app/api/btc-price-at/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const TICKER_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutos

export async function GET(req: NextRequest) {
  const ts = req.nextUrl.searchParams.get('ts')
  if (!ts) return NextResponse.json({ error: 'ts required' }, { status: 400 })

  const date = new Date(ts)
  if (isNaN(date.getTime())) return NextResponse.json({ error: 'ts inválido' }, { status: 400 })

  const now = Date.now()
  const targetMs = date.getTime()
  if (targetMs > now) return NextResponse.json({ error: 'ts futuro' }, { status: 400 })

  try {
    if (now - targetMs < TICKER_THRESHOLD_MS) {
      const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCBRL')
      if (!res.ok) throw new Error(`binance ticker ${res.status}`)
      const data = await res.json() as { price: string }
      return NextResponse.json({ btcPriceBrl: parseFloat(data.price), source: 'binance-ticker' })
    }

    const url = `https://api.binance.com/api/v3/klines?symbol=BTCBRL&interval=1h&startTime=${targetMs}&limit=1`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`binance klines ${res.status}`)
    const data = await res.json() as unknown[][]
    if (!data.length) return NextResponse.json({ error: 'no-data' }, { status: 404 })
    const close = parseFloat(data[0][4] as string)
    return NextResponse.json({ btcPriceBrl: close, source: 'binance-klines' })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 503 })
  }
}
```

- [ ] **Step 2: Smoke test manual da rota**

Com o servidor rodando (`npm run dev`), testar 3 cenários:

```bash
# Preço atual (dentro dos últimos 5min)
curl "http://localhost:3000/api/btc-price-at?ts=$(date -u +%Y-%m-%dT%H:%M)"
# Esperado: { btcPriceBrl: <número>, source: "binance-ticker" }

# Preço histórico (data passada)
curl "http://localhost:3000/api/btc-price-at?ts=2024-05-15T14:00"
# Esperado: { btcPriceBrl: <número>, source: "binance-klines" }

# Data antes de 2019 (sem par BTCBRL)
curl "http://localhost:3000/api/btc-price-at?ts=2018-01-10T12:00"
# Esperado: { error: "no-data" } com status 404

# ts ausente
curl "http://localhost:3000/api/btc-price-at"
# Esperado: { error: "ts required" } com status 400
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/btc-price-at/route.ts
git commit -m "feat(api): add btc-price-at route — Binance ticker/klines by timestamp"
```

---

## Task 2: Adicionar helper `currentHour` e novos estados ao `RegisterContributionModal`

**Files:**
- Modify: `src/components/dca-tactical/DcaContributionHistory.tsx` (linhas ~641 e ~728–745)

- [ ] **Step 1: Adicionar função helper `currentHour` antes da linha 642**

Localizar o comentário `// ─── Edit modal ───` (linha ~641) e inserir a função **antes** dele:

```typescript
function currentHour(): string {
  return `${String(new Date().getHours()).padStart(2, '0')}:00`
}
```

- [ ] **Step 2: Adicionar novos estados ao `RegisterContributionModal` (linha ~733)**

Localizar bloco de estados do `RegisterContributionModal`. O bloco atual começa com:

```typescript
  const today = new Date().toISOString().slice(0, 10)
  const [amountMask,       setAmountMask]       = useState('')
  const [date,             setDate]             = useState(today)
  const [type,             setType]             = useState<ContributionType>('TACTICAL')
  const [btcInput,         setBtcInput]         = useState('')
  const [btcPriceMask,     setBtcPriceMask]     = useState('')
  const [outrosCustosMask, setOutrosCustosMask] = useState('')
  const [notes,            setNotes]            = useState('')
  const [saving,           setSaving]           = useState(false)
  const [error,            setError]            = useState<string | null>(null)
```

Substituir por:

```typescript
  const today = new Date().toISOString().slice(0, 10)
  const [amountMask,       setAmountMask]       = useState('')
  const [date,             setDate]             = useState(today)
  const [time,             setTime]             = useState(currentHour)
  const [type,             setType]             = useState<ContributionType>('TACTICAL')
  const [btcInput,         setBtcInput]         = useState('')
  const [btcPriceMask,     setBtcPriceMask]     = useState('')
  const [priceAutoFilled,  setPriceAutoFilled]  = useState(false)
  const [fetchingPrice,    setFetchingPrice]    = useState(false)
  const [outrosCustosMask, setOutrosCustosMask] = useState('')
  const [notes,            setNotes]            = useState('')
  const [saving,           setSaving]           = useState(false)
  const [error,            setError]            = useState<string | null>(null)
```

- [ ] **Step 3: Adicionar `useEffect` de auto-fetch no `RegisterContributionModal`**

Inserir **após** o bloco de `const parsedAmount / parsedSats / parsedBtcPrice / parsedOutrosCustos / calcEffective` e **antes** de `async function handleSubmit`:

```typescript
  useEffect(() => {
    if (!date || !time) return
    const id = setTimeout(async () => {
      setFetchingPrice(true)
      try {
        const res = await fetch(`/api/btc-price-at?ts=${date}T${time}`)
        if (!res.ok) return
        const { btcPriceBrl } = await res.json() as { btcPriceBrl: number }
        setBtcPriceMask(applyBRLMask(String(Math.round(btcPriceBrl * 100))))
        setPriceAutoFilled(true)
      } catch {
        // silencioso — campo fica editável
      } finally {
        setFetchingPrice(false)
      }
    }, 500)
    return () => clearTimeout(id)
  }, [date, time])
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros novos.

- [ ] **Step 5: Commit parcial**

```bash
git add src/components/dca-tactical/DcaContributionHistory.tsx
git commit -m "feat(lancamento): add time state + auto-fetch useEffect to RegisterContributionModal"
```

---

## Task 3: Atualizar JSX do `RegisterContributionModal` — campo hora e cotação com badge

**Files:**
- Modify: `src/components/dca-tactical/DcaContributionHistory.tsx` (JSX do RegisterContributionModal)

- [ ] **Step 1: Expandir grid `Valor | Data` para `Valor | Data | Hora`**

Localizar no JSX do `RegisterContributionModal`:

```tsx
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div><label style={lbl}>Valor *</label><input type="text" inputMode="numeric" value={amountMask} onChange={e => setAmountMask(applyBRLMask(e.target.value))} placeholder="R$ 0,00" style={inp} /></div>
            <div><label style={lbl}>Data *</label><input type="date" value={date} onChange={e => setDate(e.target.value)} max={today} style={inp} /></div>
          </div>
```

Substituir por:

```tsx
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: '14px', marginBottom: '14px' }}>
            <div><label style={lbl}>Valor *</label><input type="text" inputMode="numeric" value={amountMask} onChange={e => setAmountMask(applyBRLMask(e.target.value))} placeholder="R$ 0,00" style={inp} /></div>
            <div><label style={lbl}>Data *</label><input type="date" value={date} onChange={e => setDate(e.target.value)} max={today} style={inp} /></div>
            <div><label style={lbl}>Hora</label><input type="time" step="3600" value={time} onChange={e => setTime(e.target.value)} style={inp} /></div>
          </div>
```

- [ ] **Step 2: Atualizar campo "Cotação do mercado" para mostrar estado loading + badge "auto"**

Localizar no JSX do `RegisterContributionModal` (dentro do grid BTC comprado | Cotação):

```tsx
            <div><label style={lbl}>Cotação do mercado</label><input type="text" inputMode="numeric" value={btcPriceMask} onChange={e => setBtcPriceMask(applyBRLMask(e.target.value))} placeholder="R$ 0,00" style={inp} /></div>
```

Substituir por:

```tsx
            <div>
              <label style={lbl}>Cotação do mercado</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  inputMode="numeric"
                  value={fetchingPrice ? '' : btcPriceMask}
                  onChange={e => { setBtcPriceMask(applyBRLMask(e.target.value)); setPriceAutoFilled(false) }}
                  placeholder={fetchingPrice ? 'Buscando...' : 'R$ 0,00'}
                  disabled={fetchingPrice}
                  style={{ ...inp, paddingRight: priceAutoFilled && !fetchingPrice ? '52px' : '12px' }}
                />
                {priceAutoFilled && !fetchingPrice && (
                  <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', fontWeight: 700, color: 'var(--orange)', background: 'rgba(249,115,22,0.12)', padding: '2px 6px', borderRadius: '4px', pointerEvents: 'none' }}>
                    auto
                  </span>
                )}
              </div>
            </div>
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/components/dca-tactical/DcaContributionHistory.tsx
git commit -m "feat(lancamento): add hora field + auto badge to RegisterContributionModal"
```

---

## Task 4: Adicionar hora + auto-fetch ao `EditContributionModal`

**Files:**
- Modify: `src/components/dca-tactical/DcaContributionHistory.tsx` (linhas ~642–726)

O `EditContributionModal` tem comportamento diferente: **não re-faz fetch no mount** (o registro já tem preço salvo). Re-fetch ocorre apenas se o usuário alterar a data.

- [ ] **Step 1: Adicionar novos estados ao `EditContributionModal` (linha ~649)**

Localizar bloco de estados do `EditContributionModal`. O bloco atual:

```typescript
  const [amountMask,       setAmountMask]       = useState(contribution.amount ? applyBRLMask(String(Math.round(contribution.amount * 100))) : '')
  const [date,             setDate]             = useState(contribution.contribution_date)
  const [type,             setType]             = useState<ContributionType>(contribution.contribution_type)
  const [btcInput,         setBtcInput]         = useState(contribution.sats_purchased ? (contribution.sats_purchased / 1e8).toFixed(8).replace(/\.?0+$/, '') : '')
  const [btcPriceMask,     setBtcPriceMask]     = useState(contribution.btc_price_brl ? applyBRLMask(String(Math.round(contribution.btc_price_brl * 100))) : '')
  const [outrosCustosMask, setOutrosCustosMask] = useState(fee ? applyBRLMask(String(Math.round(fee * 100))) : '')
  const [notes,            setNotes]            = useState(baseNotes)
  const [saving,           setSaving]           = useState(false)
  const [error,
```

Substituir por:

```typescript
  const [amountMask,       setAmountMask]       = useState(contribution.amount ? applyBRLMask(String(Math.round(contribution.amount * 100))) : '')
  const [date,             setDate]             = useState(contribution.contribution_date)
  const [time,             setTime]             = useState(currentHour)
  const [type,             setType]             = useState<ContributionType>(contribution.contribution_type)
  const [btcInput,         setBtcInput]         = useState(contribution.sats_purchased ? (contribution.sats_purchased / 1e8).toFixed(8).replace(/\.?0+$/, '') : '')
  const [btcPriceMask,     setBtcPriceMask]     = useState(contribution.btc_price_brl ? applyBRLMask(String(Math.round(contribution.btc_price_brl * 100))) : '')
  const [priceAutoFilled,  setPriceAutoFilled]  = useState(false)
  const [fetchingPrice,    setFetchingPrice]    = useState(false)
  const [outrosCustosMask, setOutrosCustosMask] = useState(fee ? applyBRLMask(String(Math.round(fee * 100))) : '')
  const [notes,            setNotes]            = useState(baseNotes)
  const [saving,           setSaving]           = useState(false)
  const [error,
```

- [ ] **Step 2: Adicionar `useRef` para data inicial e `useEffect` de auto-fetch no `EditContributionModal`**

Adicionar `useRef` para rastrear data inicial logo após os estados, antes dos `const parsed...`:

```typescript
  const initialDate = useRef(contribution.contribution_date)
```

Depois inserir o `useEffect` **antes** de `async function handleSubmit`:

```typescript
  useEffect(() => {
    if (!date || !time || date === initialDate.current) return
    const id = setTimeout(async () => {
      setFetchingPrice(true)
      try {
        const res = await fetch(`/api/btc-price-at?ts=${date}T${time}`)
        if (!res.ok) return
        const { btcPriceBrl } = await res.json() as { btcPriceBrl: number }
        setBtcPriceMask(applyBRLMask(String(Math.round(btcPriceBrl * 100))))
        setPriceAutoFilled(true)
      } catch {
        // silencioso
      } finally {
        setFetchingPrice(false)
      }
    }, 500)
    return () => clearTimeout(id)
  }, [date, time])
```

- [ ] **Step 3: Atualizar JSX do `EditContributionModal` — grid com campo hora**

Localizar no JSX do `EditContributionModal`:

```tsx
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div><label style={lbl}>Valor *</label><input type="text" inputMode="numeric" value={amountMask} onChange={e => setAmountMask(applyBRLMask(e.target.value))} placeholder="R$ 0,00" style={inp} /></div>
            <div><label style={lbl}>Data *</label><input type="date" value={date} onChange={e => setDate(e.target.value)} style={inp} /></div>
          </div>
```

Substituir por:

```tsx
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: '14px', marginBottom: '14px' }}>
            <div><label style={lbl}>Valor *</label><input type="text" inputMode="numeric" value={amountMask} onChange={e => setAmountMask(applyBRLMask(e.target.value))} placeholder="R$ 0,00" style={inp} /></div>
            <div><label style={lbl}>Data *</label><input type="date" value={date} onChange={e => setDate(e.target.value)} style={inp} /></div>
            <div><label style={lbl}>Hora</label><input type="time" step="3600" value={time} onChange={e => setTime(e.target.value)} style={inp} /></div>
          </div>
```

- [ ] **Step 4: Atualizar campo "Cotação do mercado" no `EditContributionModal`**

Localizar no JSX do `EditContributionModal` (dentro do grid BTC comprado | Cotação):

```tsx
            <div><label style={lbl}>Cotação do mercado</label><input type="text" inputMode="numeric" value={btcPriceMask} onChange={e => setBtcPriceMask(applyBRLMask(e.target.value))} placeholder="R$ 0,00" style={inp} /></div>
```

Substituir por:

```tsx
            <div>
              <label style={lbl}>Cotação do mercado</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  inputMode="numeric"
                  value={fetchingPrice ? '' : btcPriceMask}
                  onChange={e => { setBtcPriceMask(applyBRLMask(e.target.value)); setPriceAutoFilled(false) }}
                  placeholder={fetchingPrice ? 'Buscando...' : 'R$ 0,00'}
                  disabled={fetchingPrice}
                  style={{ ...inp, paddingRight: priceAutoFilled && !fetchingPrice ? '52px' : '12px' }}
                />
                {priceAutoFilled && !fetchingPrice && (
                  <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', fontWeight: 700, color: 'var(--orange)', background: 'rgba(249,115,22,0.12)', padding: '2px 6px', borderRadius: '4px', pointerEvents: 'none' }}>
                    auto
                  </span>
                )}
              </div>
            </div>
```

- [ ] **Step 5: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/components/dca-tactical/DcaContributionHistory.tsx
git commit -m "feat(lancamento): add hora field + auto-fetch to EditContributionModal"
```

---

## Task 5: Smoke test visual no browser

**Files:** nenhum — só verificação.

- [ ] **Step 1: Subir servidor de dev**

```bash
npm run dev
```

- [ ] **Step 2: Testar `RegisterContributionModal`**

1. Navegar para `/lancamento`
2. Clicar em "Registrar aporte"
3. Verificar: campo "Hora" aparece ao lado de "Data"
4. Verificar: ao abrir, campo "Cotação do mercado" mostra "Buscando..." por ~500ms
5. Verificar: campo preenche com preço atual + badge "auto" laranja
6. Mudar data para `2024-05-15` e hora para `14:00`
7. Verificar: campo re-preenche com preço histórico daquela data/hora
8. Editar manualmente o campo cotação
9. Verificar: badge "auto" desaparece
10. Colocar data de `2018-01-01` → campo fica vazio (sem crash)

- [ ] **Step 3: Testar `EditContributionModal`**

1. Clicar em editar em qualquer lançamento existente
2. Verificar: campo "Hora" aparece ao lado de "Data"
3. Verificar: preço existente do registro está pré-preenchido, **sem** badge "auto", **sem** fetch automático
4. Mudar a data do lançamento → verificar que fetch dispara e preenche novo preço com badge "auto"

- [ ] **Step 4: Commit final se necessário**

```bash
git add -p  # só se houver ajustes finos após o teste visual
git commit -m "fix(lancamento): visual adjustments after smoke test"
```
