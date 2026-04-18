'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { SubmitInput } from '@/components/SubmitInput'
import { ThemeToggle } from '@/components/ThemeToggle'
import type { ExtractedEvent } from '@/types/event'

export default function SubmitPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUrl(url: string) {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (!response.ok) throw new Error('Extraction failed')
      const data = await response.json() as ExtractedEvent
      sessionStorage.setItem('sit_draft', JSON.stringify(data))
      router.push('/submit/confirm')
    } catch {
      setError('Could not extract event details. You can still fill them in manually.')
      const empty: ExtractedEvent = {
        title: '', start_at: '', end_at: null, location: '', description: '',
        rsvp_url: url, image_url: null, tags: [], extraction_partial: true,
      }
      sessionStorage.setItem('sit_draft', JSON.stringify(empty))
      router.push('/submit/confirm')
    } finally {
      setLoading(false)
    }
  }

  async function handleImage(file: File) {
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const response = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) throw new Error('Extraction failed')
      const data = await response.json() as ExtractedEvent
      sessionStorage.setItem('sit_draft', JSON.stringify(data))
      router.push('/submit/confirm')
    } catch {
      setError('Could not read the image. Please try again or fill in manually.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Header */}
      <header style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link
            href="/"
            style={{
              fontFamily: 'var(--font-playfair)',
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--text)',
              textDecoration: 'none',
              lineHeight: 1.2,
            }}
          >
            ← SiT Calendar
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Content */}
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 16px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{
            fontFamily: 'var(--font-playfair)',
            fontSize: '28px',
            fontWeight: 700,
            color: 'var(--text)',
            marginBottom: '6px',
          }}>
            Share an event
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Paste a link or drop a poster — we&apos;ll fill in the details.
          </p>
        </div>

        <SubmitInput onUrl={handleUrl} onImage={handleImage} loading={loading} />

        {error && (
          <div style={{
            marginTop: '16px',
            background: 'var(--accent-bg)',
            border: '1px solid',
            borderColor: 'var(--accent)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: '14px' }}>⚠</span>
            <p style={{ fontSize: '13px', color: 'var(--accent)', lineHeight: 1.5 }}>{error}</p>
          </div>
        )}

        <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '12px', color: 'var(--text-subtle)' }}>
          Events are reviewed by a moderator before going live
        </p>
      </div>
    </main>
  )
}
