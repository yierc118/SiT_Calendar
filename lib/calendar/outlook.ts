import type { ApprovedEvent } from '@/types/event'

function addOneHour(iso: string): string {
  const date = new Date(iso)
  date.setHours(date.getHours() + 1)
  return date.toISOString()
}

export function buildOutlookCalendarUrl(event: ApprovedEvent): string {
  const params = new URLSearchParams({
    subject: event.title,
    startdt: event.start_at,
    enddt: event.end_at ?? addOneHour(event.start_at),
    body: event.description ?? '',
    location: event.location ?? '',
  })
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params}`
}
