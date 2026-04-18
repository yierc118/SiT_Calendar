import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Action = 'approve' | 'reject'

interface UpdateBody {
  action: Action
  updates?: Partial<{
    title: string
    start_at: string
    end_at: string | null
    location: string
    description: string
    rsvp_url: string
    image_url: string | null
    tags: string[]
  }>
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: moderator } = await supabase
    .from('moderators')
    .select('email')
    .eq('email', user.email ?? '')
    .single()

  if (!moderator) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json() as UpdateBody

  const update: Record<string, unknown> = {
    ...(body.updates ?? {}),
    status: body.action === 'approve' ? 'approved' : 'rejected',
  }

  if (body.action === 'approve') {
    update.approved_at = new Date().toISOString()
    update.approved_by = user.email
  }

  const { error } = await supabase
    .from('events')
    .update(update)
    .eq('id', id)
    .eq('status', 'pending') // Safety: only update pending events

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
