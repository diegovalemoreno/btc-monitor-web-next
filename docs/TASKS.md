# BTC Monitor — Task Log

## TASK-001 · DCA Tático / Capital Allocation Engine

**Status:** ✅ Concluída (2026-05-24)

### Objetivo

Criar a base conceitual, funcional e visual da aba DCA Tático — transformando os indicadores do app em orientação prática de alocação mensal.

### Arquivos criados

| Arquivo | Tipo | Descrição |
|---|---|---|
| `src/lib/dca-tactical/types.ts` | Domínio | Tipos canônicos do engine |
| `src/lib/dca-tactical/score.ts` | Domínio | Score engine + classificação de estado + sinais de indicadores |
| `src/lib/dca-tactical/allocation.ts` | Domínio | Cálculo de alocação BRL |
| `src/components/dca-tactical/DcaScoreGauge.tsx` | UI | Gauge SVG semicircular |
| `src/components/dca-tactical/DcaConfigCard.tsx` | UI | Card de configuração (leitura + edição) |
| `src/components/dca-tactical/DcaRecommendationCard.tsx` | UI | Card principal de recomendação |
| `src/components/dca-tactical/DcaIndicatorBreakdown.tsx` | UI | Tabela de indicadores com impacto |
| `src/components/dca-tactical/DcaCapitalAllocationCard.tsx` | UI | Visualização de alocação de capital |
| `src/components/dca-tactical/DcaEducationalNotice.tsx` | UI | Aviso educativo obrigatório |
| `src/components/dca-tactical/DcaTacticalPage.tsx` | UI | Página client principal (orquestra tudo) |
| `docs/SPEC.md` | Docs | Especificação do produto |
| `docs/TASKS.md` | Docs | Este arquivo |

### Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `src/app/dca/page.tsx` | Adicionado sistema de abas: "DCA Intelligence" + "DCA Tático". Roteamento via searchParams `?tab=`. |

### Decisões arquiteturais

1. **Score derivado do motor existente** — O DCA Opportunity Score combina os 5 scores já calculados pelo signal engine (opportunity, risk, conviction, euphoria, capitulation) com pesos explícitos. Não cria um novo motor paralelo.

2. **Config em localStorage (v1)** — A configuração tática (structuralDcaPct, minReservePct, usedThisMonth, strategyProfile) é persistida em `localStorage` com chave `btcm_dca_tac_cfg_v1`. Isso evita alterações de schema agora e mantém a feature funcional sem dependência de DB.

3. **Abas via searchParams** — Navegação entre "DCA Intelligence" e "DCA Tático" usa `?tab=` para manter compatibilidade com server components e evitar estado client desnecessário.

4. **Dados de mercado via API** — `DcaTacticalPage` busca de `/api/market-snapshot/current` no cliente. Isso garante dados frescos e reutiliza o endpoint existente.

5. **Gauge SVG puro** — O `DcaScoreGauge` usa SVG com cálculo de arco semicircular. Dois segmentos de 90° no track evitam o caso degenerado de arco exatamente 180° no SVG spec.

6. **Perfil mapeado do plano existente** — Se o usuário tem um DcaPlan no DB, o `risk_profile` é mapeado para `strategyProfile` inicial do DCA Tático. O usuário pode sobrescrever na config card.

7. **Indicadores via `buildIndicatorSignals`** — Usa os `IndicatorGroup[]` retornados pelo signal engine. Score -10..+10 → 5 categorias de impacto. Ordenados por magnitude absoluta para priorizar os mais relevantes.

### Regras de cálculo implementadas

**Score:**
```
score = (opportunityScore × 0.35) + ((100 - riskScore) × 0.30)
      + (convictionScore × 0.20) + (capitulationScore × 0.10)
      + ((100 - euphoriaScore) × 0.05)
```

**Alocação:**
```
structuralAmount = monthly × structuralDcaPct%
tacticalPool     = monthly - structuralAmount
deployFrac       = min(1 - minReservePct%, stateIntensity × profileMult)
tacticalNow      = tacticalPool × deployFrac
tacticalReserve  = tacticalPool - tacticalNow
```

Estado → intensidade base: DEFENSIVE=0%, NEUTRAL=35%, FAVORABLE=65%, AGGRESSIVE=100%
Perfil → multiplicador: CONSERVATIVE=0.60×, BALANCED=1.00×, AGGRESSIVE=1.35×

### Pendências reais

| ID | Descrição | Prioridade |
|---|---|---|
| P-001 | Migrar config tática de localStorage para DB (nova coluna em `dca_plans` ou tabela `dca_tactical_configs`) | Média |
| P-002 | Rastrear `usedThisMonth` automaticamente via histórico de recomendações aceitas (sem entrada manual) | Baixa |
| P-003 | Adicionar MVRV e Mayer Multiple como indicadores nomeados no breakdown (dependem de nome exato no signal engine) | Baixa |
| P-004 | Tela mobile: ajustar grid da `DcaRecommendationCard` para stack single-column em < 640px | Média |
| P-005 | Adicionar tooltips de explicação das ponderações do score | Baixa |

### Critérios de aceite — verificação

- [x] Existe tela/aba DCA Tático
- [x] Existe cálculo inicial do score (determinístico, auditável)
- [x] Existe classificação de estado de mercado (4 estados)
- [x] Existe sugestão de alocação entre DCA estrutural, aporte tático e reserva
- [x] Existe breakdown dos indicadores com impacto e explicação
- [x] Existe explicação legível da sugestão (summary do signal engine)
- [x] Existe aviso educativo de não recomendação financeira
- [x] UI segue design do projeto (CSS vars, inline styles, dark/orange theme)
- [x] Documentação atualizada
- [x] Sem promessa de lucro
- [x] Sem compra automática
- [x] Sem implementação fora do escopo

---

## Próxima task recomendada

**TASK-002 · Responsividade mobile da DCA Tático**

O grid da `DcaRecommendationCard` usa `gridTemplateColumns: 'minmax(200px, 260px) 1fr'` que pode não empilhar bem em telas < 400px. Adicionar media query para single-column em mobile (Pendência P-004).
