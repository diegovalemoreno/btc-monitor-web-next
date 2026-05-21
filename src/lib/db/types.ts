// ================================================================
// Database types — mirror of Supabase schema
// ================================================================

export type AlertType =
  | 'TACTICAL_OPPORTUNITY'
  | 'AGGRESSIVE_OPPORTUNITY'
  | 'HIGH_RISK'
  | 'EUPHORIA_WARNING'
  | 'CAPITULATION_SIGNAL'
  | 'DELEVERAGING_SIGNAL'
  | 'REGIME_CHANGE'

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type RiskProfile = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE'
export type DcaAction = 'WAIT' | 'REDUCED_DCA' | 'NORMAL_DCA' | 'REINFORCED_DCA' | 'AGGRESSIVE_DCA'
export type Confidence = 'LOW' | 'MEDIUM' | 'HIGH'
export type NotificationChannel = 'telegram' | 'email'
export type NotificationStatus = 'sent' | 'failed' | 'skipped'

// ── market_snapshots ─────────────────────────────────────────────

export interface MarketSnapshotRow {
  id: string
  btc_price_usd: number | null
  market_regime: string
  risk_score: number
  opportunity_score: number
  euphoria_score: number | null
  capitulation_score: number | null
  conviction_score: number
  summary: string | null
  indicators: Record<string, unknown>
  created_at: string
}

export type InsertMarketSnapshot = Omit<MarketSnapshotRow, 'id' | 'created_at'>

// ── user_profiles ────────────────────────────────────────────────

export interface UserProfileRow {
  id: string
  user_id: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export type UpdateUserProfile = Partial<Pick<UserProfileRow, 'display_name' | 'avatar_url'>>

// ── alert_subscriptions ──────────────────────────────────────────

export interface AlertSubscriptionRow {
  id: string
  user_id: string
  profile: RiskProfile
  enabled: boolean
  telegram_enabled: boolean
  telegram_chat_id: string | null
  email_enabled: boolean
  min_severity: Severity
  created_at: string
  updated_at: string
}

export type UpsertAlertSubscription = Omit<AlertSubscriptionRow, 'id' | 'created_at' | 'updated_at'>

// ── alert_events ─────────────────────────────────────────────────

export interface AlertEventRow {
  id: string
  user_id: string
  snapshot_id: string | null
  type: AlertType
  severity: Severity
  title: string
  message: string
  context: Record<string, unknown> | null
  created_at: string
}

export type InsertAlertEvent = Omit<AlertEventRow, 'id' | 'created_at'>

// ── notification_logs ────────────────────────────────────────────

export interface NotificationLogRow {
  id: string
  user_id: string
  alert_event_id: string | null
  channel: NotificationChannel
  status: NotificationStatus
  error_message: string | null
  sent_at: string | null
  created_at: string
}

export type InsertNotificationLog = Omit<NotificationLogRow, 'id' | 'created_at'>

// ── dca_plans ────────────────────────────────────────────────────

export interface DcaPlanRow {
  id: string
  user_id: string
  enabled: boolean
  monthly_amount_brl: number
  risk_profile: RiskProfile
  default_buy_day: number | null
  reserve_percentage: number
  created_at: string
  updated_at: string
}

export type UpsertDcaPlan = Omit<DcaPlanRow, 'id' | 'created_at' | 'updated_at'>

// ── dca_recommendations ──────────────────────────────────────────

export interface DcaRecommendationRow {
  id: string
  user_id: string
  dca_plan_id: string | null
  snapshot_id: string | null
  action: DcaAction
  recommended_amount_brl: number | null
  reserve_amount_brl: number | null
  confidence: Confidence
  rationale: string
  context: Record<string, unknown> | null
  created_at: string
}

export type InsertDcaRecommendation = Omit<DcaRecommendationRow, 'id' | 'created_at'>
