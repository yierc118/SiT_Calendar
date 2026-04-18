'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ConfirmForm } from '@/components/ConfirmForm'
import { ThemeToggle } from '@/components/ThemeToggle'
import type { ExtractedEvent } from '@/types/event'

export default function ConfirmPage() {
  const router = useRouter()
  const [draft, setDraft] = useState<ExtractedEvent | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [duplicate, setDuplicate] = useState<{ id: string; title: string } | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('sit_draft')
    if (!stored) {
      router.push('/submit')
      return
    }
    const parsed = JSON.parse(stored) as ExtractedEvent
    setDraft(parsed)

    // Check for duplicates via API (server-side — lib/duplicates is server-only)
    if (parsed.rsvp_url) {
      fetch(`/api/check-duplicate?url=${encodeURIComponent(parsed.rsvp_url)}`)
        .then((r) => r.json())
        .then(({ duplicate }) => { if (duplicate) setDuplicate(duplicate) })
    }
  }, [router])

  async function handleSubmit(
    data: ExtractedEvent & { submitter_name: string; submitter_email: string }
  ) {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          start_at: data.start_at,
          end_at: data.end_at,
          location: data.location,
          description: data.description,
          rsvp_url: data.rsvp_url,
          image_url: data.image_url,
          tags: data.tags,
          submitter_name: data.submitter_name || null,
          submitter_email: data.submitter_email || null,
        }),
      })
      if (!response.ok) throw new Error('Submit failed')
      sessionStorage.removeItem('sit_draft')
      setDone(true)
    } catch {
      setSubmitError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '360px', width: '100%', textAlign: 'center' }}>
          <div style={{
            width: '64px', height: '64px',
            background: 'var(--accent-bg)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px',
            margin: '0 auto 20px',
          }}>🎉</div>
          <h1 style={{
            fontFamily: 'var(--font-playfair)',
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--text)',
            marginBottom: '8px',
          }}>Thanks for sharing!</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '28px', lineHeight: 1.6 }}>
            Your event is under review. It&apos;ll appear on the calendar once approved.
          </p>
          <Link
            href="/"
            style={{
              background: 'var(--accent)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 700,
              padding: '10px 24px',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              fontFamily: 'var(--font-playfair)',
            }}
          >
            ← Back to calendar
          </Link>
        </div>
      </main>
    )
  }

  // Loading state while draft loads from sessionStorage
  if (!draft) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px', height: '32px',
            border: '3px solid var(--border)',
            borderTop: '3px solid var(--accent)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Loading event details…</p>
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
          <Link
            href="/submit"
            style={{
              fontFamily: 'var(--font-playfair)',
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--text)',
              textDecoration: 'none',
            }}
          >
            ← Back
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 16px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{
            fontFamily: 'var(--font-playfair)',
            fontSize: '26px',
            fontWeight: 700,
            color: 'var(--text)',
            marginBottom: '6px',
          }}>
            Review event details
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            We extracted these details — please check and correct anything that looks wrong.
          </p>
        </div>

        {/* Duplicate warning */}
        {duplicate && (
          <div style={{
            marginBottom: '16px',
            background: '#FEF3C7',
            border: '1px solid #F59E0B',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            display: 'flex',
            gap: '8px',
          }}>
            <span style={{ fontSize: '14px', flexShrink: 0 }}>⚠</span>
            <p style={{ fontSize: '13px', color: '#92400E', lineHeight: 1.5 }}>
              <strong>This event may already be submitted:</strong>{' '}
              <a href={`/#event-${duplicate.id}`} style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                {duplicate.title}
              </a>
            </p>
          </div>
        )}

        {/* Partial extraction notice */}
        {draft.extraction_partial && (
          <div style={{
            marginBottom: '16px',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            display: 'flex',
            gap: '8px',
          }}>
            <span style={{ fontSize: '14px', flexShrink: 0 }}>ℹ</span>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              We couldn&apos;t extract all details automatically — please fill in the missing fields.
            </p>
          </div>
        )}

        {/* Submit error banner */}
        {submitError && (
          <div style={{
            marginBottom: '16px',
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            display: 'flex',
            gap: '8px',
          }}>
            <span style={{ fontSize: '14px', flexShrink: 0 }}>✕</span>
            <p style={{ fontSize: '13px', color: '#991B1B', lineHeight: 1.5 }}>{submitError}</p>
          </div>
        )}

        <ConfirmForm draft={draft} onSubmit={handleSubmit} submitting={submitting} />
      </div>
    </main>
  )
}
