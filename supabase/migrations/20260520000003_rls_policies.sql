-- ================================================================
-- Migration 003: RLS policies for all private tables
-- Every private table: select/insert/update/delete scoped to user
-- ================================================================

-- ── user_profiles ────────────────────────────────────────────────

alter table user_profiles enable row level security;

create policy "users can view own profile"
  on user_profiles for select
  using (auth.uid() = user_id);

create policy "users can insert own profile"
  on user_profiles for insert
  with check (auth.uid() = user_id);

create policy "users can update own profile"
  on user_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete own profile"
  on user_profiles for delete
  using (auth.uid() = user_id);

-- ── alert_subscriptions ──────────────────────────────────────────

alter table alert_subscriptions enable row level security;

create policy "users can view own alert_subscriptions"
  on alert_subscriptions for select
  using (auth.uid() = user_id);

create policy "users can insert own alert_subscriptions"
  on alert_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "users can update own alert_subscriptions"
  on alert_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete own alert_subscriptions"
  on alert_subscriptions for delete
  using (auth.uid() = user_id);

-- ── alert_events ─────────────────────────────────────────────────

alter table alert_events enable row level security;

create policy "users can view own alert_events"
  on alert_events for select
  using (auth.uid() = user_id);

-- insert only via service role (cron jobs) — no user policy
-- service role bypasses RLS

-- ── notification_logs ────────────────────────────────────────────

alter table notification_logs enable row level security;

create policy "users can view own notification_logs"
  on notification_logs for select
  using (auth.uid() = user_id);

-- insert/update only via service role

-- ── dca_plans ────────────────────────────────────────────────────

alter table dca_plans enable row level security;

create policy "users can view own dca_plans"
  on dca_plans for select
  using (auth.uid() = user_id);

create policy "users can insert own dca_plans"
  on dca_plans for insert
  with check (auth.uid() = user_id);

create policy "users can update own dca_plans"
  on dca_plans for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete own dca_plans"
  on dca_plans for delete
  using (auth.uid() = user_id);

-- ── dca_recommendations ──────────────────────────────────────────

alter table dca_recommendations enable row level security;

create policy "users can view own dca_recommendations"
  on dca_recommendations for select
  using (auth.uid() = user_id);

-- insert only via service role (cron jobs)
