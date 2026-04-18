'use client'

import { useState, useRef, useEffect } from 'react'
import { buildGoogleCalendarUrl } from '@/lib/calendar/google'
import { buildOutlookCalendarUrl } from '@/lib/calendar/outlook'
import type { ApprovedEvent } from '@/types/event'

interface DropdownPos { top: number; left: number }

export function SaveToCalendarMenu({ event }: { event: ApprovedEvent }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<DropdownPos>({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  function openMenu() {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const dropdownWidth = 170
    // Flip left if near right edge
    const left = rect.right + dropdownWidth > window.innerWidth
      ? rect.right - dropdownWidth
      : rect.left
    setPos({ top: rect.bottom + 6, left })
    setOpen(true)
  }

  useEffect(() => {
    function handleClose(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClose)
    return () => document.removeEventListener('mousedown', handleClose)
  }, [open])

  // Close on scroll so the fixed dropdown doesn't drift
  useEffect(() => {
    if (open) {
      window.addEventListener('scroll', () => setOpen(false), { once: true, capture: true })
    }
  }, [open])

  return (
    <>
      <button
        ref={buttonRef}
        onClick={open ? () => setOpen(false) : openMenu}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Save to calendar"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          background: 'var(--accent-bg)',
          color: 'var(--accent)',
          border: '1px solid',
          borderColor: 'var(--accent)',
          borderRadius: 'var(--radius-sm)',
          padding: '6px 10px',
          fontSize: '12px',
          fontWeight: 700,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          opacity: 0.9,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        Save {open ? '▴' : '▾'}
      </button>

      {open && (
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            padding: '4px 0',
            zIndex: 999,
            minWidth: '170px',
          }}
        >
          {[
            { label: 'Google Calendar', href: buildGoogleCalendarUrl(event), icon: 'G' },
            { label: 'Outlook', href: buildOutlookCalendarUrl(event), icon: 'O' },
            { label: 'Apple Calendar', href: `/api/events/${event.id}/ics`, download: `${event.title}.ics`, icon: '⌘' },
          ].map(({ label, href, icon, download }) => (
            <a
              key={label}
              href={href}
              target={download ? undefined : '_blank'}
              rel={download ? undefined : 'noopener noreferrer'}
              download={download}
              onClick={() => setOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 14px',
                fontSize: '13px',
                color: 'var(--text)',
                textDecoration: 'none',
              }}
            >
              <span style={{
                width: '20px',
                height: '20px',
                borderRadius: '4px',
                background: 'var(--surface-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                flexShrink: 0,
              }}>{icon}</span>
              {label}
            </a>
          ))}
        </div>
      )}
    </>
  )
}
