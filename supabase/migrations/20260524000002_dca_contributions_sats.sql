-- Migration 005: add sats_purchased and btc_price_brl to dca_contributions
alter table dca_contributions
  add column if not exists sats_purchased bigint      check (sats_purchased > 0),
  add column if not exists btc_price_brl  numeric(20,2) check (btc_price_brl > 0);
