# Design: Auto-preenchimento do Preço BTC no Lançamento

**Data:** 2026-06-08  
**Status:** Aprovado

## Contexto

O form de lançamento (`RegisterContributionModal` e `EditContributionModal` em `DcaContributionHistory.tsx`) tem campo "Cotação do mercado" que o usuário preenche manualmente. A experiência é ruim — o usuário precisa buscar o preço externamente e digitar.

**Objetivo:** Ao selecionar data e hora do aporte, buscar automaticamente o preço BTC/BRL da Binance e pré-preencher o campo. O usuário ainda pode editar manualmente se quiser.

---

## Arquitetura

### Arquivos modificados

| Arquivo | Ação |
|---|---|
| `src/app/api/btc-price-at/route.ts` | Criar — nova rota de lookup histórico |
| `src/components/dca-tactical/DcaContributionHistory.tsx` | Editar — campos de hora + auto-fetch |

Nenhuma mudança de schema de banco. `contribution_date` permanece `TEXT` (YYYY-MM-DD). O horário é usado apenas para lookup do preço.

---

## Rota API: `GET /api/btc-price-at`

### Contrato

```
GET /api/btc-price-at?ts=2024-05-15T14:00
```

**Resposta sucesso:**
```json
{ "btcPriceBrl": 620000, "source": "binance-klines" }
```

**Resposta erro:**
```json
{ "error": "ts inválido" }   // 400
{ "error": "binance error" } // 503
```

### Lógica de seleção da fonte

```
ts fornecido
  → converte para Unix ms
  → se ts > Date.now() - 5min:
      → Binance ticker GET /api/v3/ticker/price?symbol=BTCBRL
      → source = "binance-ticker"
  → senão:
      → Binance klines GET /api/v3/klines?symbol=BTCBRL&interval=1h&startTime={ms}&limit=1
      → usa campo [4] (close price do candle de 1h)
      → source = "binance-klines"
```

### Tratamento de edge cases na rota

- `ts` ausente ou inválido → 400
- `ts` futuro → 400
- Klines retorna array vazio (data antes de ~2019, par inexistente) → 404 `{ error: "no-data" }`
- Binance fora do ar → 503

---

## Mudanças no Form

### Campos novos (ambos modais)

Campo `time` (tipo `"time"`, step=`"3600"`) adicionado ao lado do campo `date` no mesmo grid 2-col.

**Defaults:**
- `RegisterContributionModal`: hora atual arredondada para baixo (ex: 14:47 → `"14:00"`)
- `EditContributionModal`: não re-fetch automático ao abrir (preço já existe). Re-fetch dispara se o usuário mudar a data.

### Novo estado (ambos modais)

```ts
const [time,            setTime]            = useState(currentHour())
const [priceAutoFilled, setPriceAutoFilled] = useState(false)
const [fetchingPrice,   setFetchingPrice]   = useState(false)
```

### Lógica de auto-fetch

`useEffect` escuta `[date, time]` com debounce de 500ms:

```
date ou time muda
  → debounce 500ms
  → setFetchingPrice(true)
  → GET /api/btc-price-at?ts={date}T{time}
  → sucesso:
      → setBtcPriceMask(applyBRLMask(String(Math.round(price * 100))))
      → setPriceAutoFilled(true)
  → falha (qualquer status de erro):
      → silencioso — campo fica editável, sem mensagem de erro
  → sempre: setFetchingPrice(false)
```

### UI do campo "Cotação do mercado"

```
[Cotação do mercado]          [auto] ← badge laranja pequeno, visível só quando auto-preenchido
[R$ 620.000,00               ]
```

- Badge "auto" some quando `setPriceAutoFilled(false)` (i.e., usuário edita manualmente)
- Campo fica `disabled` + placeholder `"Buscando..."` durante fetch
- Ao re-habilitar após fetch: foco não é roubado do campo atual

---

## Edge Cases

| Situação | Comportamento |
|---|---|
| Data futura | Campo bloqueado (`max={today}` já existe) |
| Data antes de 2019 | 404 da rota → campo vazio, editável |
| Binance fora do ar | 503 → silencioso, campo editável |
| Modal editar abre | Sem re-fetch (preço já salvo no registro) |
| Usuário muda data no editar | Re-fetch dispara normalmente |
| Horário = agora ±5min | Usa ticker atual |
| Usuário limpa campo manualmente | `setPriceAutoFilled(false)` — badge some |

---

## Fluxo Completo (happy path)

```
1. Usuário abre "Registrar aporte"
2. Data default = hoje, hora default = hora atual arredondada
3. useEffect dispara fetch automático
4. Campo cotação pré-preenchido com preço atual + badge "auto"
5. Usuário muda data para 2024-05-15, hora para 14:00
6. Debounce 500ms → fetch /api/btc-price-at?ts=2024-05-15T14:00
7. Campo cotação atualizado com preço histórico
8. Usuário preenche valor, BTC comprado e registra
```

---

## Não incluído neste escopo

- Persistir o horário do aporte no banco (fora de escopo)
- Fallback para CoinGecko ou Mercado Bitcoin no histórico (Binance tem dados desde 2019 para BTCBRL)
- Mensagem de erro visual quando lookup falha (silencioso por design)
