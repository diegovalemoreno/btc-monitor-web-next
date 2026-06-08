export interface HistoricalReturnRow {
  scoreRange:  string
  return3m:    number    // percentage, negative = loss
  return6m:    number
  return12m:   number
  references:  string[]
  isCurrent:   boolean
}

interface TableRow {
  scoreRange:  string
  minScore:    number
  maxScore:    number
  return3m:    number    // percentage, negative = loss
  return6m:    number
  return12m:   number
  references:  string[]
}

const TABLE: TableRow[] = [
  { scoreRange: '0–20',   minScore: 0,  maxScore: 20,  return3m:  30, return6m:  85, return12m: 190, references: ['Nov/2022', 'Mar/2020'] },
  { scoreRange: '20–35',  minScore: 20, maxScore: 35,  return3m:  18, return6m:  60, return12m: 130, references: ['Jul/2021', 'Jan/2023'] },
  { scoreRange: '35–55',  minScore: 35, maxScore: 55,  return3m:  10, return6m:  38, return12m:  87, references: ['Set/2021', 'Out/2023'] },
  { scoreRange: '55–70',  minScore: 55, maxScore: 70,  return3m:   4, return6m:  15, return12m:  38, references: [] },
  { scoreRange: '70–85',  minScore: 70, maxScore: 85,  return3m:  -5, return6m:   5, return12m:  18, references: [] },
  { scoreRange: '85–100', minScore: 85, maxScore: 101, return3m: -18, return6m: -10, return12m:   3, references: ['Nov/2021', 'Mar/2024'] },
]

export function getHistoricalReturns(score: number): HistoricalReturnRow[] {
  return TABLE.map(({ minScore, maxScore, ...rest }) => ({
    ...rest,
    isCurrent: score >= minScore && score < maxScore,
  }))
}
