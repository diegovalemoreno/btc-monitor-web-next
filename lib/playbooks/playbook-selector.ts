// ============================================================
// playbooks/playbook-selector.ts
// Mapeamento MarketRegime → TacticalPlaybook.
// Sem regra de negócio — só lookup.
// ============================================================

import { MarketRegime, TacticalPlaybook } from "../shared/types/signal";

const PLAYBOOKS: Record<MarketRegime, TacticalPlaybook> = {
  CAPITULATION_ZONE: {
    allowed: [
      "Aumentar DCA com cautela",
      "Dividir aportes em tranches",
      "Priorizar compras planejadas",
    ],
    avoid: [
      "Comprar tudo de uma vez",
      "Usar alavancagem",
      "Agir por FOMO",
    ],
  },
  TACTICAL_BUY_AGGRESSIVE: {
    allowed: [
      "Compra tática acima do DCA padrão",
      "Aumentar posição gradualmente",
      "Aproveitar valuation favorável",
    ],
    avoid: [
      "Usar alavancagem",
      "Concentrar todo aporte de uma vez",
    ],
  },
  TACTICAL_BUY_MODERATE: {
    allowed: [
      "Aumentar levemente o DCA",
      "Compra tática com parcelas menores",
    ],
    avoid: [
      "Usar alavancagem",
      "Fazer aportes grandes de uma vez",
    ],
  },
  TACTICAL_BUY_LIGHT: {
    allowed: [
      "Manter DCA padrão",
      "Considerar pequeno aporte extra",
    ],
    avoid: [
      "Alterar drasticamente a estratégia",
      "Usar alavancagem",
    ],
  },
  NEUTRAL: {
    allowed: [
      "Manter DCA padrão",
      "Aguardar confluências mais claras",
    ],
    avoid: [
      "Fazer aportes táticos sem confluência",
      "Alterar estratégia de longo prazo",
    ],
  },
  RISK_OFF: {
    allowed: [
      "Manter DCA padrão reduzido",
      "Aguardar normalização do mercado",
    ],
    avoid: [
      "Aportes táticos extras",
      "Usar alavancagem",
      "Aumentar exposição",
    ],
  },
  EXTREME_RISK: {
    allowed: [
      "Apenas DCA padrão mínimo se houver convicção de longo prazo",
    ],
    avoid: [
      "Qualquer posição tática",
      "Alavancagem",
      "Aumentar exposição",
      "Agir por FOMO ou pânico",
    ],
  },
  OVERLEVERAGED_MARKET: {
    allowed: [
      "Manter DCA padrão com cautela",
      "Aguardar desalavancagem do mercado",
    ],
    avoid: [
      "Usar alavancagem",
      "Aportes táticos extras",
      "Aumentar posição em derivativos",
    ],
  },
  EUPHORIA_ZONE: {
    allowed: [
      "Manter DCA padrão",
      "Considerar redução de exposição se fora do plano",
    ],
    avoid: [
      "Aumentar exposição",
      "Usar alavancagem",
      "Agir por FOMO",
      "Fazer aportes táticos adicionais",
    ],
  },
};

export function selectPlaybook(regime: MarketRegime): TacticalPlaybook {
  return PLAYBOOKS[regime];
}
