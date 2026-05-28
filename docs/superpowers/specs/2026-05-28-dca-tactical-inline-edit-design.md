# DCA Tático — Edição Inline de Lançamentos

**Data:** 2026-05-28  
**Escopo:** Adicionar botão de edição (✎) em cada row de aporte no card "Status do Mês — Caixa Tático", sem sair da tela.

---

## Objetivo

Usuário pode editar lançamentos exibidos no card `DcaStatusDoMesCard` diretamente na tela DCA Tático. Atualmente o card é read-only e redireciona para `/lancamento`.

## Arquitetura

### 1. Novo arquivo: `EditContributionModal.tsx`

**Path:** `src/components/dca-tactical/EditContributionModal.tsx`

Extraído de `DcaContributionHistory.tsx` (função `EditContributionModal` já existe ali, ~80 linhas). Move para arquivo próprio sem alteração de lógica:

- Props: `contribution: DcaContributionRow`, `onClose: () => void`, `onSave: (updated: DcaContributionRow) => void`
- Formulário: valor (BRL mask), data, tipo (`STRUCTURAL_DCA | TACTICAL | MANUAL`), sats comprados, cotação BTC, outros custos/taxa, observações
- API call: `PATCH /api/dca/contributions/[id]` com body `{ amount, contribution_date, contribution_type, notes, sats_purchased, btc_price_brl, effective_price_brl }`
- On save: chama `onSave(updated)` com `DcaContributionRow` retornado pela API

### 2. Alteração: `DcaContributionHistory.tsx`

Remove definição local de `EditContributionModal`, importa de `./EditContributionModal`. Comportamento idêntico — sem breaking change.

### 3. Alteração: `DcaStatusDoMesCard.tsx`

**Props novas:**
```ts
onUpdate?: (updated: DcaContributionRow) => void
```

**Estado novo (local):**
```ts
const [editingContribution, setEditingContribution] = useState<DcaContributionRow | null>(null)
```

**Cada row de aporte:** adiciona botão ✎ no lado direito (mesmo estilo de `DcaContributionHistory` — `rgba(99,102,241,0.12)` bg, borda `rgba(99,102,241,0.3)`, cor `#818cf8`).

**On save callback:**
```ts
function handleSaveEdit(updated: DcaContributionRow) {
  setEditingContribution(null)
  onUpdate?.(updated)
}
```

Renderiza `<EditContributionModal>` quando `editingContribution !== null`.

O componente continua aceitando `contributions` como prop — não gerencia o array internamente. Atualização do array é responsabilidade do parent.

### 4. Alteração: `DcaTacticalPage.tsx`

Passa `onUpdate` para `DcaStatusDoMesCard`:

```ts
function handleContributionUpdate(updated: DcaContributionRow) {
  setContributions(prev => prev.map(c => c.id === updated.id ? updated : c))
}
```

O array `contributions` já alimenta `usedThisMonth` e `disponivel` no card — ao atualizar o array, os totais recalculam automaticamente.

## Fluxo de dados

```
Usuário clica ✎
  → setEditingContribution(c)
  → EditContributionModal abre preenchido
  → Usuário edita e salva
  → PATCH /api/dca/contributions/[id]
  → API retorna DcaContributionRow atualizado
  → onSave(updated) → handleSaveEdit
  → onUpdate(updated) → DcaTacticalPage atualiza array
  → DcaStatusDoMesCard re-renderiza com novos valores
  → Totais (Utilizado / Disponível) recalculados
```

## Arquivos modificados

| Arquivo | Tipo |
|---|---|
| `src/components/dca-tactical/EditContributionModal.tsx` | Novo (extraído) |
| `src/components/dca-tactical/DcaContributionHistory.tsx` | Refactor: importa modal |
| `src/components/dca-tactical/DcaStatusDoMesCard.tsx` | Feature: botão ✎ + modal |
| `src/components/dca-tactical/DcaTacticalPage.tsx` | Feature: onUpdate callback |

## O que NÃO muda

- Nenhuma mudança na API (`/api/dca/contributions/[id]` já suporta `PATCH` e `DELETE`)
- Nenhuma mudança no banco de dados
- Comportamento da tela `/lancamento` idêntico
- Limite de 5 aportes exibidos no card permanece — editar mais via `/lancamento`
