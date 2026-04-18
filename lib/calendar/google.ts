import type { ApprovedEvent } from '@/types/event'

function toGoogleDatetime(iso: string): string {
  // Convert ISO 8601 UTC to YYYYMMDDTHHMMSSZ
  return iso.replace(/[-:]/g, '').replace('.000Z', 'Z').replace(/\.\d+Z$/, 'Z')
}

function addOneHour(iso: string): string {
  const date = new Date(iso)
  date.setHours(date.getHours() + 1)
  return date.toISOString()
}

export function buildGoogleCalendarUrl(event: ApprovedEvent): string {
  const start = toGoogleDatetime(event.start_at)
  const end = toGoogleDatetime(event.end_at ?? addOneHour(event.start_at))

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${start}/${end}`,
    details: event.description ?? '',
    location: event.location ?? '',
  })
  return `https://calendar.google.com/calendar/render?${params}`
}
