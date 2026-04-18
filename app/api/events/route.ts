import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      title: string
      start_at: string
      end_at: string | null
      location: string
      description: string
      rsvp_url: string | null
      image_url: string | null
      tags: string[]
      submitter_name: string | null
      submitter_email: string | null
    }

    if (!body.title || !body.start_at) {
      return NextResponse.json({ error: 'title and start_at are required' }, { status: 400 })
    }

    if (body.rsvp_url && !body.rsvp_url.match(/^https?:\/\//)) {
      return NextResponse.json({ error: 'rsvp_url must start with http:// or https://' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('events')
      .insert({
        title: body.title,
        start_at: body.start_at,
        end_at: body.end_at,
        location: body.location,
        description: body.description,
        rsvp_url: body.rsvp_url,
        image_url: body.image_url,
        tags: body.tags,
        submitter_name: body.submitter_name,
        submitter_email: body.submitter_email,
        status: 'pending',
      })
      .select('id')
      .single()

    if (error) throw error
    return NextResponse.json({ id: data.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/events]', err)
    return NextResponse.json({ error: 'Failed to save event' }, { status: 500 })
  }
}
