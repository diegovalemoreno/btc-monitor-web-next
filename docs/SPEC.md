# BTC Monitor — Especificação do Produto

## DCA Tático / Capital Allocation Engine

### Objetivo

A aba DCA Tático responde à pergunta:

> Quanto do meu aporte mensal faz sentido usar agora e quanto faz sentido preservar para oportunidades melhores?

O sistema transforma os indicadores do app em uma orientação prática de alocação mensal para Bitcoin, dividindo o aporte entre DCA estrutural, aporte tático imediato e reserva tática.

A proposta não é tentar acertar fundo, mas ajudar o usuário a aplicar capital com disciplina, gestão de liquidez e leitura objetiva dos indicadores.

---

### Nomenclatura

| Termo de UI | Interno / técnico |
|---|---|
| DCA Tático | Capital Allocation Engine |
| Perfil Conservador | `CONSERVATIVE` |
| Perfil Equilibrado | `BALANCED` |
| Perfil Agressivo | `AGGRESSIVE` |

---

### Entradas do usuário

| Campo | Tipo | Padrão | Descrição |
|---|---|---|---|
| Aporte mensal (R$) | number | — | Total disponível por mês para BTC |
| Perfil de estratégia | `DcaStrategyProfile` | `BALANCED` | Intensidade de alocação por cenário |
| DCA estrutural (%) | number | 50 | % do aporte sempre executado |
| Reserva tática mínima (%) | number | 10 | Mínimo a preservar do caixa tático |
| Já aportei este mês (R$) | number | 0 | Rastreio manual do caixa usado |

Configuração armazenada em `localStorage` com chave `btcm_dca_tac_cfg_v1`.

Pendência: migrar para persistência via `dca_plans` ou tabela dedicada.

---

### Saídas do sistema

| Campo | Descrição |
|---|---|
| DCA Opportunity Score (0-100) | Intensidade sugerida de alocação |
| Estado do mercado | DEFENSIVE / NEUTRAL / FAVORABLE / AGGRESSIVE |
| DCA estrutural (R$) | Parte sempre executada |
| Aporte tático sugerido agora (R$) | Parte tática a usar no cenário atual |
| Reserva tática sugerida (R$) | Parte a preservar para oportunidades futuras |
| Caixa tático restante (R$) | Pool menos o que já foi usado no mês |
| Breakdown de indicadores | Score por indicador + impacto + explicação |

---

### DCA Opportunity Score

Score composto derivado dos scores já existentes no motor de mercado.

**Fórmula:**
```
score = opportunityScore × 0.35
      + (100 - riskScore) × 0.30
      + convictionScore × 0.20
      + capitulationScore × 0.10
      + (100 - euphoriaScore) × 0.05
```

Pesos racionais:
- Oportunidade (35%): sinal primário de entrada favorável
- Segurança (30%): ambiente sem risco elevado
- Convicção (20%): concordância entre dimensões
- Capitulação (10%): bonus quando mercado capitulou
- Anti-euforia (5%): penalidade por euforia extrema

---

### Estados de mercado

| Score | Estado | Interpretação |
|---|---|---|
| 0–25 | DEFENSIVE | Preservar caixa — aguardar melhor janela |
| 26–50 | NEUTRAL | Manter DCA moderado — sem urgência tática |
| 51–75 | FAVORABLE | Janela de aporte — aumentar intensidade |
| 76–100 | AGGRESSIVE | Usar maior parte do caixa tático |

---

### Perfis de estratégia

| Perfil | Multiplicador | Comportamento |
|---|---|---|
| CONSERVATIVE | 0.60× | Deploya menos capital por cenário |
| BALANCED | 1.00× | Comportamento padrão |
| AGGRESSIVE | 1.35× | Usa mais caixa em cenários favoráveis |

Intensidade base por estado:

| Estado | Intensidade base |
|---|---|
| DEFENSIVE | 0% |
| NEUTRAL | 35% |
| FAVORABLE | 65% |
| AGGRESSIVE | 100% |

Deploy efetivo = intensidade × multiplicador de perfil, limitado a (100% - reserva mínima).

---

### Regras de linguagem (anti-recomendação financeira)

**Evitar:**
- "compre agora"
- "oportunidade garantida"
- "sinal de lucro"
- "fundo confirmado"
- "você vai ganhar"

**Preferir:**
- "aporte sugerido"
- "cenário atual"
- "intensidade sugerida"
- "reserva tática"
- "a decisão final é sua"

O texto legal obrigatório em toda tela DCA Tático:

> Esta análise não é recomendação financeira. O objetivo é apoiar disciplina de aporte com base em dados de mercado. Scores e alocações são sugestões orientativas — a decisão final é sempre sua.

---

### Indicadores considerados

Todos derivados do `IndicatorGroup[]` retornado pelo signal engine.

Grupos: Sentimento, Derivativos, On-chain, Tendência, Macro, Síntese.

Cada indicador recebe um impacto com base no score bruto:

| Score | Impacto |
|---|---|
| ≥ +6 | Positivo forte |
| +2 a +5 | Positivo |
| -1 a +1 | Neutro |
| -5 a -2 | Negativo |
| ≤ -6 | Negativo forte |

---

### O que o sistema NÃO faz

- Não executa compras automaticamente
- Não integra com exchanges
- Não promete lucro
- Não prevê fundos de mercado
