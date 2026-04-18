import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { EventCard } from '@/components/EventCard'
import { CalendarGrid } from '@/components/CalendarGrid'
import { ThemeToggle } from '@/components/ThemeToggle'
import type { ApprovedEvent } from '@/types/event'

type ViewMode = 'list' | 'month'

interface BrowsePageProps {
  searchParams: Promise<{ view?: string }>
}

const SAMPLE_EVENTS: ApprovedEvent[] = [
  {
    id: 'sample-1',
    title: 'Women in Tech Singapore Meetup — Summer Edition',
    start_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    end_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 2.5 * 60 * 60 * 1000).toISOString(),
    location: 'WeWork Funan, 5 North Bridge Rd',
    description: 'A casual evening for women in tech across Singapore. Networking, lightning talks, and drinks.',
    rsvp_url: '#',
    image_url: null,
    tags: ['Networking', 'Women in Tech', 'Free'],
    status: 'approved',
    submitter_name: 'Priya R.',
    submitter_email: null,
    submitted_at: new Date().toISOString(),
    approved_at: new Date().toISOString(),
    approved_by: 'mod@sit.sg',
  },
  {
    id: 'sample-2',
    title: "AI Ethics Panel: Who's responsible when the model gets it wrong?",
    start_at: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    end_at: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 1.5 * 60 * 60 * 1000).toISOString(),
    location: 'NUS Biz School · online option',
    description: 'Panel discussion on AI accountability. Who is responsible when AI models cause harm?',
    rsvp_url: '#',
    image_url: null,
    tags: ['Learning', 'Tech', 'AI'],
    status: 'approved',
    submitter_name: 'Sarah',
    submitter_email: null,
    submitted_at: new Date().toISOString(),
    approved_at: new Date().toISOString(),
    approved_by: 'mod@sit.sg',
  },
  {
    id: 'sample-3',
    title: 'Saturday Morning Run + Coffee — Botanic Gardens',
    start_at: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
    end_at: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
    location: 'Tanglin Gate entrance, Singapore Botanic Gardens',
    description: 'Casual 5km run followed by coffee. All paces welcome.',
    rsvp_url: '#',
    image_url: null,
    tags: ['Wellness', 'Free', 'Community'],
    status: 'approved',
    submitter_name: 'Min N.',
    submitter_email: null,
    submitted_at: new Date().toISOString(),
    approved_at: new Date().toISOString(),
    approved_by: 'mod@sit.sg',
  },
]

async function getUpcomingEvents(): Promise<ApprovedEvent[]> {
  try {
    const supabase = await createClient()
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'approved')
      .gte('start_at', now)
      .order('start_at', { ascending: true })
    if (error || !data || data.length === 0) return SAMPLE_EVENTS
    return data as ApprovedEvent[]
  } catch {
    return SAMPLE_EVENTS
  }
}

function groupByWeek(events: ApprovedEvent[]): Map<string, ApprovedEvent[]> {
  const groups = new Map<string, ApprovedEvent[]>()
  events.forEach((event) => {
    const date = new Date(event.start_at)
    const day = date.getDay()
    const monday = new Date(date)
    monday.setDate(date.getDate() - ((day + 6) % 7))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const fmt = (d: Date) => d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', timeZone: 'Asia/Singapore' })
    const label = `${fmt(monday)} – ${fmt(sunday)}`
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(event)
  })
  return groups
}

function isCurrentWeek(events: ApprovedEvent[]): boolean {
  if (!events.length) return false
  const now = new Date()
  const eventDate = new Date(events[0].start_at)
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 7)
  return eventDate >= monday && eventDate < sunday
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const { view } = await searchParams
  const viewMode: ViewMode = view === 'month' ? 'month' : 'list'
  const events = await getUpcomingEvents()
  const grouped = groupByWeek(events)

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Header */}
      <header style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: '20px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
              SiT Calendar
            </h1>
            <p style={{ fontSize: '11px', color: 'var(--text-subtle)', marginTop: '1px' }}>shared by the community · not organised by us</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ThemeToggle />
            <Link
              href="/submit"
              style={{
                background: 'var(--accent)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 700,
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
              }}
            >
              + Share an event
            </Link>
          </div>
        </div>

        {/* View tabs */}
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 16px', display: 'flex', borderTop: '1px solid var(--border)' }}>
          {[
            { label: '≡ List', value: 'list', href: '/?view=list' },
            { label: '⊞ Month', value: 'month', href: '/?view=month' },
          ].map(({ label, value, href }) => (
            <Link
              key={value}
              href={href}
              style={{
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
                borderBottom: viewMode === value ? '2px solid var(--accent)' : '2px solid transparent',
                color: viewMode === value ? 'var(--accent)' : 'var(--text-muted)',
                marginBottom: '-1px',
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      </header>

      {/* Content */}
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '24px 16px' }}>
        {viewMode === 'list' ? (
          <div>
            {events.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text-subtle)', padding: '48px 0' }}>No upcoming events yet.</p>
            )}
            {Array.from(grouped.entries()).map(([weekLabel, weekEvents]) => (
              <div key={weekLabel} style={{ marginBottom: '32px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '12px',
                }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '1.5px',
                    color: isCurrentWeek(weekEvents) ? 'var(--accent)' : 'var(--text-subtle)',
                  }}>
                    {isCurrentWeek(weekEvents) ? `This week` : weekLabel}
                  </span>
                  {isCurrentWeek(weekEvents) && (
                    <span style={{ fontSize: '10px', color: 'var(--text-subtle)', fontWeight: 500 }}>{weekLabel}</span>
                  )}
                  <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {weekEvents.map((event) => <EventCard key={event.id} event={event} />)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <CalendarGrid events={events} />
        )}
      </div>

      {/* Footer */}
      <footer style={{
        maxWidth: '680px',
        margin: '0 auto',
        padding: '20px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>© Sponsors in Tech</span>
        <a href="/admin/login" style={{ fontSize: '12px', color: 'var(--text-subtle)', textDecoration: 'none' }}>Admin</a>
      </footer>
    </main>
  )
}
