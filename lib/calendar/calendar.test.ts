import { describe, it, expect } from 'vitest'
import { buildGoogleCalendarUrl } from './google'
import { buildOutlookCalendarUrl } from './outlook'
import { generateIcs } from './ics'
import type { ApprovedEvent } from '@/types/event'

const event: ApprovedEvent = {
  id: 'evt-1',
  title: 'Women in Tech Meetup',
  start_at: '2026-04-07T10:30:00Z',
  end_at: '2026-04-07T13:00:00Z',
  location: 'WeWork Funan, Singapore',
  description: 'Networking event for women in tech.',
  rsvp_url: 'https://lu.ma/wit-sg',
  image_url: null,
  tags: ['networking'],
  status: 'approved',
  submitter_name: 'Priya R.',
  submitter_email: null,
  submitted_at: '2026-04-01T10:00:00Z',
  approved_at: '2026-04-01T11:00:00Z',
  approved_by: 'mod@sit.sg',
}

describe('buildGoogleCalendarUrl', () => {
  it('contains required query params', () => {
    const url = buildGoogleCalendarUrl(event)
    expect(url).toContain('calendar.google.com')
    expect(url).toContain('Women+in+Tech+Meetup')
    expect(url).toContain('20260407T103000Z')
    expect(url).toContain('WeWork+Funan')
  })
})

describe('buildOutlookCalendarUrl', () => {
  it('contains required query params', () => {
    const url = buildOutlookCalendarUrl(event)
    expect(url).toContain('outlook.live.com')
    expect(url).toContain('Women+in+Tech+Meetup')
  })
})

describe('generateIcs', () => {
  it('produces valid .ics content', () => {
    const ics = generateIcs(event)
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('BEGIN:VEVENT')
    expect(ics).toContain('DTSTART:20260407T103000Z')
    expect(ics).toContain('SUMMARY:Women in Tech Meetup')
    expect(ics).toContain('END:VEVENT')
    expect(ics).toContain('END:VCALENDAR')
  })
})
