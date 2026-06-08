# DCA Tático — Edição Inline de Lançamentos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar botão ✎ em cada row de aporte no `DcaStatusDoMesCard` para editar lançamentos sem sair da tela DCA Tático.

**Architecture:** Exportar `EditContributionModal` de `DcaContributionHistory.tsx` (onde já existe com toda lógica completa). `DcaStatusDoMesCard` importa o modal, adiciona estado local `editingContribution`, e dispara callback `onUpdate` ao salvar. `DcaTacticalPage` implementa `onUpdate` atualizando o array de contributions no estado.

**Tech Stack:** Next.js App Router, React (useState, createPortal), TypeScript, Supabase via API routes existentes (`PATCH /api/dca/contributions/[id]`).

---

## File Map

| Arquivo | Mudança |
|---|---|
| `src/components/dca-tactical/DcaContributionHistory.tsx` | Exportar `EditContributionModal` (linha 597: `function` → `export function`) |
| `src/components/dca-tactical/DcaStatusDoMesCard.tsx` | Importar modal, adicionar `useState`, prop `onUpdate`, botão ✎, renderizar modal |
| `src/components/dca-tactical/DcaTacticalPage.tsx` | Adicionar `handleContributionUpdate`, passar `onUpdate` para `DcaStatusDoMesCard` |

---

## Task 1: Exportar EditContributionModal

**Files:**
- Modify: `src/components/dca-tactical/DcaContributionHistory.tsx:597`

- [ ] **Step 1: Adicionar `export` à função EditContributionModal**

Linha 597, trocar:
```ts
function EditContributionModal({ contribution, onClose, onSave }: {
```
por:
```ts
export function EditContributionModal({ contribution, onClose, onSave }: {
```

- [ ] **Step 2: Verificar que o build não quebra**

```bash
cd /Users/diegomoreno/development/btc-monitor-web-next
npx tsc --noEmit 2>&1 | head -30
```

Expected: sem erros relacionados a `EditContributionModal`.

- [ ] **Step 3: Commit**

```bash
git add src/components/dca-tactical/DcaContributionHistory.tsx
git commit -m "refactor(dca-tactical): export EditContributionModal for reuse"
```

---

## Task 2: Adicionar edição inline ao DcaStatusDoMesCard

**Files:**
- Modify: `src/components/dca-tactical/DcaStatusDoMesCard.tsx`

- [ ] **Step 1: Atualizar imports e Props**

Substituir o topo do arquivo:
```tsx
'use client'

import { useState } from 'react'
import type { DcaContributionRow } from '@/lib/db/types'
import { EditContributionModal } from './DcaContributionHistory'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)

type MonthStatus = 'not_started' | 'partial' | 'completed' | 'exceeded'

function getMonthStatus(used: number, pool: number): MonthStatus {
  if (used <= 0)             return 'not_started'
  if (used > pool)           return 'exceeded'
  if (used >= pool * 0.99)   return 'completed'
  return 'partial'
}

const STATUS_META: Record<MonthStatus, { label: string; color: string; bg: string; border: string }> = {
  not_started: { label: 'Não iniciado', color: 'var(--text-muted)', bg: 'var(--text-dim)', border: 'var(--text-dim)' },
  partial:     { label: 'Em andamento', color: '#f59e0b',                bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)'  },
  completed:   { label: 'Concluído',    color: '#4ade80',                bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.2)'  },
  exceeded:    { label: 'Excedido',     color: '#f87171',                bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.25)' },
}

interface Props {
  tacticalPool:  number
  contributions: DcaContributionRow[]
  usedThisMonth: number
  onUpdate?:     (updated: DcaContributionRow) => void
}
```

- [ ] **Step 2: Adicionar estado local e handler no componente**

Substituir a assinatura do componente e primeiras linhas:
```tsx
export default function DcaStatusDoMesCard({ tacticalPool, contributions, usedThisMonth, onUpdate }: Props) {
  const [editingContribution, setEditingContribution] = useState<DcaContributionRow | null>(null)

  const status     = getMonthStatus(usedThisMonth, tacticalPool)
  const meta       = STATUS_META[status]
  const pctUsed    = tacticalPool > 0 ? Math.min(100, (usedThisMonth / tacticalPool) * 100) : 0
  const excedido   = Math.max(0, usedThisMonth - tacticalPool)
  const disponivel = Math.max(0, tacticalPool - usedThisMonth)

  function handleSaveEdit(updated: DcaContributionRow) {
    setEditingContribution(null)
    onUpdate?.(updated)
  }
```

- [ ] **Step 3: Renderizar modal e adicionar botão ✎ em cada row**

Substituir o bloco `{/* Contributions list — read-only */}`:

```tsx
      {/* Contributions list */}
      <div style={{ padding: '16px 24px' }}>
        {editingContribution && typeof document !== 'undefined' && (
          <EditContributionModal
            contribution={editingContribution}
            onClose={() => setEditingContribution(null)}
            onSave={handleSaveEdit}
          />
        )}

        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>
          Aportes este mês
        </div>

        {contributions.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
            Nenhum aporte registrado neste mês.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {contributions.slice(0, 5).map(c => {
              const dateLabel = new Date(c.contribution_date + 'T00:00:00')
                .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
              return (
                <div key={c.id} style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          '12px',
                  padding:      '10px 14px',
                  background:   'var(--surface3)',
                  border:       '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '8px',
                }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-sec)', width: '110px', flexShrink: 0 }}>
                    {dateLabel}
                  </span>
                  <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.notes ?? '—'}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', flexShrink: 0 }}>
                    {fmt(c.amount)}
                  </span>
                  <button
                    onClick={() => setEditingContribution(c)}
                    style={{
                      background:   'rgba(99,102,241,0.12)',
                      border:       '1px solid rgba(99,102,241,0.3)',
                      borderRadius: '6px',
                      color:        '#818cf8',
                      cursor:       'pointer',
                      fontSize:     '11px',
                      fontWeight:   600,
                      padding:      '4px 8px',
                      lineHeight:   1,
                      flexShrink:   0,
                    }}
                  >✎</button>
                </div>
              )
            })}
          </div>
        )}

        <div style={{ marginTop: '14px', textAlign: 'right' }}>
          <a href="/lancamento" style={{ fontSize: '12px', color: '#f59e0b', textDecoration: 'none', fontWeight: 500 }}>
            Ver histórico completo em lançamentos →
          </a>
        </div>
      </div>
```

- [ ] **Step 4: Verificar TypeScript**

```bash
cd /Users/diegomoreno/development/btc-monitor-web-next
npx tsc --noEmit 2>&1 | head -30
```

Expected: sem erros em `DcaStatusDoMesCard.tsx`.

- [ ] **Step 5: Commit**

```bash
git add src/components/dca-tactical/DcaStatusDoMesCard.tsx
git commit -m "feat(dca-tactical): add inline edit button to DcaStatusDoMesCard rows"
```

---

## Task 3: Wiring onUpdate no DcaTacticalPage

**Files:**
- Modify: `src/components/dca-tactical/DcaTacticalPage.tsx:472-476`

- [ ] **Step 1: Adicionar handleContributionUpdate**

Logo antes do bloco `// ── Main render ─────────────────────────────────────────────────────────────────` (linha 329), adicionar:

```tsx
  function handleContributionUpdate(updated: DcaContributionRow) {
    setContributions(prev => prev.map(c => c.id === updated.id ? updated : c))
  }
```

- [ ] **Step 2: Passar onUpdate para DcaStatusDoMesCard**

Substituir (linhas 472-476):
```tsx
      {/* Month status */}
      <DcaStatusDoMesCard
        tacticalPool={tacticalPool}
        contributions={contributions}
        usedThisMonth={usedThisMonth}
      />
```
por:
```tsx
      {/* Month status */}
      <DcaStatusDoMesCard
        tacticalPool={tacticalPool}
        contributions={contributions}
        usedThisMonth={usedThisMonth}
        onUpdate={handleContributionUpdate}
      />
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd /Users/diegomoreno/development/btc-monitor-web-next
npx tsc --noEmit 2>&1 | head -30
```

Expected: zero erros.

- [ ] **Step 4: Commit**

```bash
git add src/components/dca-tactical/DcaTacticalPage.tsx
git commit -m "feat(dca-tactical): wire onUpdate to keep contributions state in sync after inline edit"
```

---

## Verificação final

- [ ] Abrir a tela DCA Tático
- [ ] Confirmar que cada row de aporte exibe botão ✎
- [ ] Clicar ✎ — modal deve abrir com campos preenchidos (valor, data, tipo, observações)
- [ ] Editar valor e salvar — row deve refletir novo valor sem refresh
- [ ] Confirmar que "Utilizado" e "Disponível" recalculam após edição
- [ ] Abrir `/lancamento` e confirmar que a edição persiste lá também
