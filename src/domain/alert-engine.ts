import type { TacticalSignal } from '@lib/shared/types/signal'
import type { AlertSubscriptionRow } from '@/lib/db/types'
import { deriveSnapshotScores } from './snapshot-scores'
import { ALERT_RULES, EvaluatedAlert } from './alert-rules'

const SEVERITY_ORDER = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
const PROFILE_ORDER  = ['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'] as const

export function meetsMinSeverity(severity: string, minSeverity: string): boolean {
  return (
    SEVERITY_ORDER.indexOf(severity as typeof SEVERITY_ORDER[number]) >=
    SEVERITY_ORDER.indexOf(minSeverity as typeof SEVERITY_ORDER[number])
  )
}

export function meetsMinProfile(alertMinProfile: string, userProfile: string): boolean {
  return (
    PROFILE_ORDER.indexOf(userProfile as typeof PROFILE_ORDER[number]) >=
    PROFILE_ORDER.indexOf(alertMinProfile as typeof PROFILE_ORDER[number])
  )
}

export function evaluateAlertsForSignal(
  signal: TacticalSignal,
  previousRegime?: string
): EvaluatedAlert[] {
  const scores = deriveSnapshotScores(signal)
  return ALERT_RULES
    .map((rule) => rule(scores, signal.regime, previousRegime))
    .filter((r): r is EvaluatedAlert => r !== null)
}

export function filterAlertsForSubscription(
  alerts: EvaluatedAlert[],
  subscription: AlertSubscriptionRow
): EvaluatedAlert[] {
  if (!subscription.enabled) return []
  return alerts.filter(
    (alert) =>
      meetsMinProfile(alert.minProfile, subscription.profile) &&
      meetsMinSeverity(alert.severity, subscription.min_severity)
  )
}
