import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateIcs } from '@/lib/calendar/ics'
import type { ApprovedEvent } from '@/types/event'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .eq('status', 'approved')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  const ics = generateIcs(data as ApprovedEvent)

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="event-${id}.ics"`,
    },
  })
}
