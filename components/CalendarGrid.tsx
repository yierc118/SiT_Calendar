'use client'

import { useState } from 'react'
import type { ApprovedEvent } from '@/types/event'
import { SaveToCalendarMenu } from './SaveToCalendarMenu'

interface CalendarGridProps {
  events: ApprovedEvent[]
}

const DAYS_OF_WEEK = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function getMonthDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = (firstDay.getDay() + 6) % 7
  const days: (Date | null)[] = Array(startPad).fill(null)
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d))
  }
  return days
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

const CHIP_COLORS = ['#C2410C', '#0369A1', '#059669', '#B45309', '#7C3AED', '#DB2777', '#0891B2']

function chipColor(event: ApprovedEvent): string {
  const hash = event.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return CHIP_COLORS[hash % CHIP_COLORS.length]
}

export function CalendarGrid({ events }: CalendarGridProps) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState<ApprovedEvent | null>(null)

  const days = getMonthDays(year, month)
  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-SG', {
    month: 'long', year: 'numeric',
  })

  function prevMonth() {
    if (month === 0) { setYear(year - 1); setMonth(11) } else setMonth(month - 1)
  }

  function nextMonth() {
    if (month === 11) { setYear(year + 1); setMonth(0) } else setMonth(month + 1)
  }

  function eventsOnDay(day: Date): ApprovedEvent[] {
    const cellStr = [
      day.getFullYear(),
      String(day.getMonth() + 1).padStart(2, '0'),
      String(day.getDate()).padStart(2, '0'),
    ].join('-')
    return events.filter((e) => {
      const sgDateStr = new Date(e.start_at).toLocaleDateString('en-CA', {
        timeZone: 'Asia/Singapore',
      })
      return sgDateStr === cellStr
    })
  }

  return (
    <div>
      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <button
          onClick={prevMonth}
          aria-label="Previous month"
          style={{
            width: '32px', height: '32px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >‹</button>
        <h2 style={{
          fontFamily: 'var(--font-playfair)',
          fontSize: '17px',
          fontWeight: 700,
          color: 'var(--text)',
        }}>{monthLabel}</h2>
        <button
          onClick={nextMonth}
          aria-label="Next month"
          style={{
            width: '32px', height: '32px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >›</button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}>
        {DAYS_OF_WEEK.map((d) => (
          <div key={d} style={{
            textAlign: 'center',
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--text-subtle)',
            padding: '4px 0',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '1px',
        background: 'var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        border: '1px solid var(--border)',
      }}>
        {days.map((day, i) => {
          if (!day) return (
            <div key={`pad-${i}`} style={{ background: 'var(--surface-2)', minHeight: '72px', minWidth: 0 }} />
          )
          const dayEvents = eventsOnDay(day)
          const isToday = sameDay(day, today)
          return (
            <div
              key={day.toISOString()}
              style={{
                background: 'var(--surface)',
                minHeight: '72px',
                minWidth: 0,
                overflow: 'hidden',
                padding: '6px',
                cursor: dayEvents.length ? 'pointer' : 'default',
              }}
            >
              <div style={{
                width: '22px', height: '22px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '50%',
                marginBottom: '3px',
                background: isToday ? 'var(--accent)' : 'transparent',
                color: isToday ? '#fff' : 'var(--text)',
                fontSize: '12px',
                fontWeight: isToday ? 700 : 500,
              }}>
                {day.getDate()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {dayEvents.slice(0, 2).map((event) => (
                  <button
                    key={event.id}
                    onClick={() => setSelected(selected?.id === event.id ? null : event)}
                    title={event.title}
                    style={{
                      display: 'block',
                      background: chipColor(event),
                      color: '#fff',
                      borderRadius: '3px',
                      fontSize: '10px',
                      padding: '1px 5px',
                      textAlign: 'left',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      width: '100%',
                      cursor: 'pointer',
                      border: 'none',
                      fontWeight: 500,
                      boxSizing: 'border-box',
                    }}
                  >
                    {event.title}
                  </button>
                ))}
                {dayEvents.length > 2 && (
                  <span style={{ fontSize: '10px', color: 'var(--text-subtle)', paddingLeft: '2px' }}>
                    +{dayEvents.length - 2} more
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Event detail popover */}
      {selected && (
        <div style={{
          marginTop: '16px',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '16px',
          background: 'var(--surface)',
          boxShadow: 'var(--shadow-md)',
          borderLeft: `4px solid ${chipColor(selected)}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{
                fontFamily: 'var(--font-playfair)',
                fontSize: '15px',
                fontWeight: 700,
                color: 'var(--text)',
                marginBottom: '5px',
              }}>{selected.title}</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                ⏰ {new Date(selected.start_at).toLocaleDateString('en-SG', {
                  weekday: 'short', day: 'numeric', month: 'short',
                  hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Singapore',
                })}
                {selected.location && <span> · 📍 {selected.location}</span>}
              </p>
              {selected.description && (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.5 }}>{selected.description}</p>
              )}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <SaveToCalendarMenu event={selected} />
                {selected.rsvp_url && (
                  <a
                    href={selected.rsvp_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '6px 12px',
                      textDecoration: 'none',
                    }}
                  >
                    RSVP ↗
                  </a>
                )}
              </div>
            </div>
            <button
              onClick={() => setSelected(null)}
              aria-label="Close event details"
              style={{
                color: 'var(--text-subtle)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                lineHeight: 1,
                flexShrink: 0,
              }}
            >×</button>
          </div>
        </div>
      )}
    </div>
  )
}
