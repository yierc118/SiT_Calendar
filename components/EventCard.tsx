import { SaveToCalendarMenu } from './SaveToCalendarMenu'
import type { ApprovedEvent } from '@/types/event'

function formatTimeRange(startIso: string, endIso: string | null): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-SG', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Singapore',
    })
  return endIso ? `${fmt(startIso)} – ${fmt(endIso)}` : fmt(startIso)
}

const TAG_PALETTE: Record<string, { bg: string; text: string }> = {
  free:            { bg: '#D1FAE5', text: '#065F46' },
  networking:      { bg: '#EDE9FE', text: '#4C1D95' },
  'women in tech': { bg: '#FCE7F3', text: '#831843' },
  learning:        { bg: '#FEF3C7', text: '#78350F' },
  tech:            { bg: '#DBEAFE', text: '#1E3A8A' },
  ai:              { bg: '#F0FDF4', text: '#14532D' },
  wellness:        { bg: '#ECFDF5', text: '#064E3B' },
  community:       { bg: '#FFF7ED', text: '#7C2D12' },
}

function tagStyle(tag: string): React.CSSProperties {
  const key = tag.toLowerCase()
  const palette = TAG_PALETTE[key]
  if (palette) return { backgroundColor: palette.bg, color: palette.text }
  return { backgroundColor: 'var(--surface-2)', color: 'var(--text-muted)' }
}

export function EventCard({ event }: { event: ApprovedEvent }) {
  const startDate = new Date(event.start_at)
  const dayName = startDate.toLocaleDateString('en-SG', { weekday: 'short', timeZone: 'Asia/Singapore' })
  const dayNum = startDate.toLocaleDateString('en-SG', { day: 'numeric', timeZone: 'Asia/Singapore' })
  const monthName = startDate.toLocaleDateString('en-SG', { month: 'short', timeZone: 'Asia/Singapore' })
  const timeRange = formatTimeRange(event.start_at, event.end_at)

  return (
    <article style={{
      display: 'flex',
      background: 'var(--surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
    }}
    className="hover-card"
    >
      {/* Terracotta date block */}
      <div style={{
        width: '76px',
        minWidth: '76px',
        background: 'var(--accent)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px 8px',
        color: '#fff',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', opacity: 0.8 }}>{dayName}</span>
        <span style={{ fontFamily: 'var(--font-playfair)', fontSize: '30px', fontWeight: 700, lineHeight: 1.1, margin: '2px 0' }}>{dayNum}</span>
        <span style={{ fontSize: '11px', fontWeight: 600, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{monthName}</span>
      </div>

      {/* Event details */}
      <div style={{ flex: 1, padding: '14px 16px', minWidth: 0 }}>
        <h3 style={{
          fontFamily: 'var(--font-playfair)',
          fontSize: '15px',
          fontWeight: 700,
          color: 'var(--text)',
          lineHeight: 1.35,
          marginBottom: '5px',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {event.title}
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
          <span><span className="sr-only">Time:</span> ⏰ {timeRange}</span>
          {event.location && (
            <span> &nbsp;·&nbsp; <span className="sr-only">Location:</span>📍 {event.location}</span>
          )}
        </p>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
          {event.tags.slice(0, 4).map((tag) => (
            <span key={tag} style={{
              ...tagStyle(tag),
              padding: '2px 8px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 500,
            }}>
              {tag}
            </span>
          ))}
          {event.submitter_name && (
            <span style={{ fontSize: '11px', color: 'var(--text-subtle)', marginLeft: '2px' }}>
              via {event.submitter_name}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '12px',
        gap: '6px',
        borderLeft: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <SaveToCalendarMenu event={event} />
        {event.rsvp_url && (
          <a
            href={event.rsvp_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              textAlign: 'center',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 10px',
              whiteSpace: 'nowrap',
              textDecoration: 'none',
              background: 'transparent',
            }}
          >
            RSVP ↗
          </a>
        )}
      </div>
    </article>
  )
}
