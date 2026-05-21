-- ================================================================
-- Migration 001: Public tables
-- market_snapshots — read-only aggregated market state
-- ================================================================

create table if not exists market_snapshots (
  id                  uuid        primary key default gen_random_uuid(),
  btc_price_usd       numeric(20, 2),
  market_regime       text        not null,
  risk_score          integer     not null,
  opportunity_score   integer     not null,
  euphoria_score      integer,
  capitulation_score  integer,
  conviction_score    integer     not null,
  summary             text,
  indicators          jsonb       not null,
  created_at          timestamptz not null default now()
);

-- Latest snapshot fast lookup
create index if not exists market_snapshots_created_at_idx
  on market_snapshots (created_at desc);

-- Public read-only
alter table market_snapshots enable row level security;

create policy "public can read market_snapshots"
  on market_snapshots
  for select
  using (true);
