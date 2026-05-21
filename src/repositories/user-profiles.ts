import { SupabaseClient } from '@supabase/supabase-js'
import type { UpdateUserProfile, UserProfileRow } from '@/lib/db/types'

export async function getProfile(
  client: SupabaseClient,
  userId: string
): Promise<UserProfileRow | null> {
  const { data, error } = await client
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) return null
  return data as UserProfileRow
}

export async function updateProfile(
  client: SupabaseClient,
  userId: string,
  patch: UpdateUserProfile
): Promise<UserProfileRow> {
  const { data, error } = await client
    .from('user_profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw new Error(`updateProfile: ${error.message}`)
  return data as UserProfileRow
}
