import { createServiceClient } from '@/lib/supabase/server'
import type { Event } from '@/types/event'

/**
 * Server-only. Checks if an event with the same rsvp_url already exists
 * (pending or approved). Returns the matching event or null.
 * Image submissions (no URL) always return null.
 */
export async function checkDuplicate(rsvpUrl: string | null | undefined): Promise<Event | null> {
  if (!rsvpUrl) return null

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('rsvp_url', rsvpUrl)
    .in('status', ['pending', 'approved'])
    .single()

  if (error || !data) return null
  return data as Event
}
