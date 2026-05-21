-- ================================================================
-- Migration 002: Private tables (all require auth.uid())
-- ================================================================

-- ── user_profiles ────────────────────────────────────────────────

create table if not exists user_profiles (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null unique references auth.users (id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Auto-create profile on first Google OAuth sign-in
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into user_profiles (user_id, display_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── alert_subscriptions ──────────────────────────────────────────

create table if not exists alert_subscriptions (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users (id) on delete cascade,
  profile           text        not null default 'MODERATE'
                                  check (profile in ('CONSERVATIVE', 'MODERATE', 'AGGRESSIVE')),
  enabled           boolean     not null default true,
  telegram_enabled  boolean     not null default false,
  telegram_chat_id  text,
  email_enabled     boolean     not null default true,
  min_severity      text        not null default 'MEDIUM'
                                  check (min_severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index if not exists alert_subscriptions_user_id_idx
  on alert_subscriptions (user_id);

-- ── alert_events ─────────────────────────────────────────────────

create table if not exists alert_events (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users (id) on delete cascade,
  snapshot_id  uuid        references market_snapshots (id) on delete set null,
  type         text        not null
                             check (type in (
                               'TACTICAL_OPPORTUNITY',
                               'AGGRESSIVE_OPPORTUNITY',
                               'HIGH_RISK',
                               'EUPHORIA_WARNING',
                               'CAPITULATION_SIGNAL',
                               'DELEVERAGING_SIGNAL',
                               'REGIME_CHANGE'
                             )),
  severity     text        not null
                             check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  title        text        not null,
  message      text        not null,
  context      jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists alert_events_user_id_created_at_idx
  on alert_events (user_id, created_at desc);

-- ── notification_logs ────────────────────────────────────────────

create table if not exists notification_logs (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users (id) on delete cascade,
  alert_event_id   uuid        references alert_events (id) on delete set null,
  channel          text        not null check (channel in ('telegram', 'email')),
  status           text        not null check (status in ('sent', 'failed', 'skipped')),
  error_message    text,
  sent_at          timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists notification_logs_user_id_idx
  on notification_logs (user_id, created_at desc);

-- ── dca_plans ────────────────────────────────────────────────────

create table if not exists dca_plans (
  id                   uuid        primary key default gen_random_uuid(),
  user_id              uuid        not null references auth.users (id) on delete cascade,
  enabled              boolean     not null default true,
  monthly_amount_brl   numeric(20, 2) not null,
  risk_profile         text        not null default 'MODERATE'
                                     check (risk_profile in ('CONSERVATIVE', 'MODERATE', 'AGGRESSIVE')),
  default_buy_day      integer     check (default_buy_day between 1 and 28),
  reserve_percentage   integer     not null default 30
                                     check (reserve_percentage between 0 and 100),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create unique index if not exists dca_plans_user_id_idx
  on dca_plans (user_id);

-- ── dca_recommendations ──────────────────────────────────────────

create table if not exists dca_recommendations (
  id                      uuid        primary key default gen_random_uuid(),
  user_id                 uuid        not null references auth.users (id) on delete cascade,
  dca_plan_id             uuid        references dca_plans (id) on delete set null,
  snapshot_id             uuid        references market_snapshots (id) on delete set null,
  action                  text        not null
                                        check (action in (
                                          'WAIT',
                                          'REDUCED_DCA',
                                          'NORMAL_DCA',
                                          'REINFORCED_DCA',
                                          'AGGRESSIVE_DCA'
                                        )),
  recommended_amount_brl  numeric(20, 2),
  reserve_amount_brl      numeric(20, 2),
  confidence              text        not null check (confidence in ('LOW', 'MEDIUM', 'HIGH')),
  rationale               text        not null,
  context                 jsonb,
  created_at              timestamptz not null default now()
);

create index if not exists dca_recommendations_user_id_created_at_idx
  on dca_recommendations (user_id, created_at desc);
