import { SupabaseClient } from '@supabase/supabase-js'
import type { DcaContributionRow, InsertDcaContribution, UpdateDcaContribution } from '@/lib/db/types'

export async function listDcaContributions(
  client: SupabaseClient,
  userId: string,
  limit = 50,
): Promise<DcaContributionRow[]> {
  const { data, error } = await client
    .from('dca_contributions')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('contribution_date', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`listDcaContributions: ${error.message}`)
  return (data ?? []) as DcaContributionRow[]
}

export async function listDcaContributionsForMonth(
  client: SupabaseClient,
  userId: string,
  year: number,
  month: number,
): Promise<DcaContributionRow[]> {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const end   = new Date(year, month, 0).toISOString().slice(0, 10) // last day of month
  const { data, error } = await client
    .from('dca_contributions')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('contribution_date', start)
    .lte('contribution_date', end)
    .order('contribution_date', { ascending: false })

  if (error) throw new Error(`listDcaContributionsForMonth: ${error.message}`)
  return (data ?? []) as DcaContributionRow[]
}

export async function insertDcaContribution(
  client: SupabaseClient,
  row: InsertDcaContribution,
): Promise<DcaContributionRow> {
  const { data, error } = await client
    .from('dca_contributions')
    .insert(row)
    .select()
    .single()

  if (error) throw new Error(`insertDcaContribution: ${error.message}`)
  return data as DcaContributionRow
}

export async function updateDcaContribution(
  client: SupabaseClient,
  id: string,
  userId: string,
  patch: UpdateDcaContribution,
): Promise<DcaContributionRow> {
  const { data, error } = await client
    .from('dca_contributions')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .select()
    .single()

  if (error) throw new Error(`updateDcaContribution: ${error.message}`)
  return data as DcaContributionRow
}

export async function softDeleteDcaContribution(
  client: SupabaseClient,
  id: string,
  userId: string,
): Promise<void> {
  const { error } = await client
    .from('dca_contributions')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .is('deleted_at', null)

  if (error) throw new Error(`softDeleteDcaContribution: ${error.message}`)
}
