-- Migration 006: add effective_price_brl to dca_contributions
-- Distinct from btc_price_brl (market reference) — captures actual price paid with spread/fees
alter table dca_contributions
  add column if not exists effective_price_brl numeric(20,2) check (effective_price_brl > 0);
