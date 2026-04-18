import type { ApprovedEvent } from '@/types/event'

function toIcsDatetime(iso: string): string {
  return iso.replace(/[-:]/g, '').replace('.000Z', 'Z').replace(/\.\d+Z$/, 'Z')
}

function addOneHour(iso: string): string {
  const date = new Date(iso)
  date.setHours(date.getHours() + 1)
  return date.toISOString()
}

function escapeIcs(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export function generateIcs(event: ApprovedEvent): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SiT Calendar//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@sit-calendar`,
    `DTSTART:${toIcsDatetime(event.start_at)}`,
    `DTEND:${toIcsDatetime(event.end_at ?? addOneHour(event.start_at))}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(event.description ?? '')}`,
    `LOCATION:${escapeIcs(event.location ?? '')}`,
    `URL:${event.rsvp_url ?? ''}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.join('\r\n')
}
