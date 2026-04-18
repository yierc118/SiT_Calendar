export type EventStatus = 'pending' | 'approved' | 'rejected'

export interface Event {
  id: string
  title: string
  start_at: string // ISO 8601, UTC
  end_at: string | null
  location: string | null
  description: string | null
  rsvp_url: string | null
  image_url: string | null
  tags: string[]
  status: EventStatus
  submitter_name: string | null
  submitter_email: string | null
  submitted_at: string
  approved_at: string | null
  approved_by: string | null
}

export type ApprovedEvent = Event & { status: 'approved' }
export type PendingEvent = Event & { status: 'pending' }

/** Shape returned by /api/extract before saving to DB */
export interface ExtractedEvent {
  title: string
  start_at: string // ISO 8601, UTC
  end_at: string | null
  location: string
  description: string
  rsvp_url: string
  image_url: string | null
  tags: string[]
  extraction_partial: boolean
}
