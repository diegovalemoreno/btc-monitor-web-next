-- ================================================================
-- Migration 004: dca_contributions — Histórico de aportes táticos
-- Users manage their own contributions (full CRUD via RLS).
-- ================================================================

create table if not exists dca_contributions (
  id                       uuid          primary key default gen_random_uuid(),
  user_id                  uuid          not null references auth.users(id) on delete cascade,
  amount                   numeric(20,2) not null check (amount > 0),
  contribution_date        date          not null default current_date,
  contribution_type        text          not null default 'TACTICAL'
                             check (contribution_type in ('STRUCTURAL_DCA', 'TACTICAL', 'MANUAL')),
  market_score_snapshot    smallint,
  market_state_snapshot    text
                             check (market_state_snapshot in ('DEFENSIVE', 'NEUTRAL', 'FAVORABLE', 'AGGRESSIVE')),
  notes                    text,
  created_at               timestamptz   not null default now(),
  updated_at               timestamptz   not null default now(),
  deleted_at               timestamptz
);

create index if not exists dca_contributions_user_date_idx
  on dca_contributions (user_id, contribution_date desc)
  where deleted_at is null;

alter table dca_contributions enable row level security;

create policy "users can manage own dca_contributions"
  on dca_contributions for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function dca_contributions_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger dca_contributions_updated_at
  before update on dca_contributions
  for each row execute procedure dca_contributions_set_updated_at();
