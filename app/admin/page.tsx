'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ModCard } from '@/components/ModCard'
import { ThemeToggle } from '@/components/ThemeToggle'
import type { PendingEvent, Event } from '@/types/event'

export default function AdminPage() {
  const [events, setEvents] = useState<PendingEvent[]>([])
  const [approvedUrls, setApprovedUrls] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: pending } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'pending')
        .order('submitted_at', { ascending: true })

      const { data: approved } = await supabase
        .from('events')
        .select('id, title, rsvp_url')
        .eq('status', 'approved')

      if (pending) setEvents(pending as PendingEvent[])

      if (approved) {
        const urlMap = new Map<string, string>()
        ;(approved as Pick<Event, 'id' | 'title' | 'rsvp_url'>[]).forEach((e) => {
          if (e.rsvp_url) urlMap.set(e.rsvp_url, e.title)
        })
        setApprovedUrls(urlMap)
      }

      setLoading(false)
    }
    load()
  }, [])

  async function updateEvent(id: string, action: 'approve' | 'reject', updates?: Partial<PendingEvent>) {
    setActionError(null)
    const response = await fetch(`/api/admin/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, updates }),
    })
    if (response.ok) {
      setEvents((prev) => prev.filter((e) => e.id !== id))
    } else {
      setActionError('Action failed. Please try again.')
    }
  }

  function handleEdit(id: string, data: Partial<PendingEvent>) {
    updateEvent(id, 'approve', data)
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '28px', height: '28px',
            border: '3px solid var(--border)',
            borderTop: '3px solid var(--accent)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Loading queue…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Header */}
      <header style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: '18px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
              Moderation queue
            </h1>
            <p style={{ fontSize: '11px', color: 'var(--text-subtle)', marginTop: '1px' }}>
              {events.length === 0 ? 'all clear' : `${events.length} pending review`}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ThemeToggle />
            <Link
              href="/"
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textDecoration: 'none',
                border: '1px solid var(--border)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              ← Calendar
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '24px 16px' }}>

        {/* Action error */}
        {actionError && (
          <div style={{
            marginBottom: '16px',
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
          }}>
            <p style={{ fontSize: '13px', color: '#991B1B' }}>{actionError}</p>
          </div>
        )}

        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <div style={{
              width: '56px', height: '56px',
              background: '#ECFDF5',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px',
              margin: '0 auto 16px',
            }}>✓</div>
            <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>Queue is clear</p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No events pending review</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {events.map((event) => {
              const duplicateTitle = event.rsvp_url ? approvedUrls.get(event.rsvp_url) : undefined
              return (
                <ModCard
                  key={event.id}
                  event={event}
                  duplicateTitle={duplicateTitle}
                  onApprove={(id) => updateEvent(id, 'approve')}
                  onReject={(id) => updateEvent(id, 'reject')}
                  onEdit={handleEdit}
                />
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
