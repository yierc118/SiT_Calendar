'use client'

import { useState } from 'react'
import type { ExtractedEvent } from '@/types/event'

interface ConfirmFormProps {
  draft: ExtractedEvent
  onSubmit: (data: ExtractedEvent & { submitter_name: string; submitter_email: string }) => void
  submitting: boolean
}

/** Convert ISO datetime string to datetime-local input value (YYYY-MM-DDTHH:mm) */
function toDatetimeLocal(iso: string): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const sgStr = d.toLocaleString('en-CA', { timeZone: 'Asia/Singapore', hour12: false })
    // en-CA gives "YYYY-MM-DD, HH:MM:SS" format
    return sgStr.replace(', ', 'T').slice(0, 16)
  } catch {
    return ''
  }
}

/** Convert datetime-local value back to ISO UTC string */
function fromDatetimeLocal(local: string): string {
  if (!local) return ''
  try {
    // Treat the local value as SGT (UTC+8)
    const d = new Date(`${local}+08:00`)
    return d.toISOString()
  } catch {
    return local
  }
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  padding: '9px 12px',
  fontSize: '14px',
  background: 'var(--surface)',
  color: 'var(--text)',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.6px',
  color: 'var(--text-muted)',
  marginBottom: '5px',
}

export function ConfirmForm({ draft, onSubmit, submitting }: ConfirmFormProps) {
  const [title, setTitle] = useState(draft.title)
  const [startAt, setStartAt] = useState(toDatetimeLocal(draft.start_at))
  const [endAt, setEndAt] = useState(toDatetimeLocal(draft.end_at ?? ''))
  const [location, setLocation] = useState(draft.location)
  const [description, setDescription] = useState(draft.description)
  const [tags, setTags] = useState<string[]>(draft.tags)
  const [newTag, setNewTag] = useState('')
  const [rsvpUrl, setRsvpUrl] = useState(draft.rsvp_url)
  const [submitterName, setSubmitterName] = useState('')
  const [submitterEmail, setSubmitterEmail] = useState('')

  function addTag() {
    const trimmed = newTag.trim()
    if (trimmed && !tags.includes(trimmed)) setTags([...tags, trimmed])
    setNewTag('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      title,
      start_at: fromDatetimeLocal(startAt),
      end_at: endAt ? fromDatetimeLocal(endAt) : null,
      location, description, rsvp_url: rsvpUrl,
      image_url: draft.image_url, tags,
      extraction_partial: draft.extraction_partial,
      submitter_name: submitterName,
      submitter_email: submitterEmail,
    })
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {draft.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={draft.image_url} alt="Event cover" style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: 'var(--radius-lg)' }} />
      )}

      <div>
        <label htmlFor="cf-title" style={labelStyle}>Event title</label>
        <input id="cf-title" required value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label htmlFor="cf-start" style={labelStyle}>Start</label>
          <input
            id="cf-start"
            type="datetime-local"
            required
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            style={{ ...inputStyle, borderColor: 'var(--accent)', color: 'var(--accent)' }}
          />
          <p style={{ fontSize: '11px', color: '#D97706', marginTop: '4px' }}>⚠ Double-check — dates are often misread</p>
        </div>
        <div>
          <label htmlFor="cf-end" style={labelStyle}>End (optional)</label>
          <input
            id="cf-end"
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label htmlFor="cf-location" style={labelStyle}>Location</label>
        <input id="cf-location" value={location} onChange={(e) => setLocation(e.target.value)} style={inputStyle} />
      </div>

      <div>
        <label htmlFor="cf-description" style={labelStyle}>Description</label>
        <textarea
          id="cf-description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }}
        />
      </div>

      <div>
        <label style={labelStyle}>Tags</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          {tags.map((tag) => (
            <span key={tag} style={{
              background: 'var(--accent-bg)',
              color: 'var(--accent)',
              padding: '3px 10px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              {tag}
              <button
                type="button"
                onClick={() => setTags(tags.filter((t) => t !== tag))}
                aria-label={`Remove tag ${tag}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '0', lineHeight: 1, fontSize: '14px' }}
              >×</button>
            </span>
          ))}
          <div style={{ display: 'flex', gap: '4px' }}>
            <input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
              placeholder="+ add tag"
              aria-label="Add a tag"
              style={{
                border: '1px dashed var(--border)',
                borderRadius: '20px',
                padding: '3px 12px',
                fontSize: '12px',
                background: 'transparent',
                color: 'var(--text)',
                outline: 'none',
                width: '90px',
              }}
            />
            <button type="button" onClick={addTag} style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>Add</button>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="cf-rsvp" style={labelStyle}>RSVP / source link</label>
        <input id="cf-rsvp" type="url" value={rsvpUrl} onChange={(e) => setRsvpUrl(e.target.value)} style={{ ...inputStyle, color: 'var(--accent)', fontSize: '13px' }} />
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label htmlFor="cf-name" style={labelStyle}>Your name (optional)</label>
          <input id="cf-name" value={submitterName} onChange={(e) => setSubmitterName(e.target.value)} placeholder="Priya R." style={inputStyle} />
        </div>
        <div>
          <label htmlFor="cf-email" style={labelStyle}>Your email (optional)</label>
          <input id="cf-email" type="email" value={submitterEmail} onChange={(e) => setSubmitterEmail(e.target.value)} placeholder="for mod follow-up only" style={{ ...inputStyle, fontSize: '12px' }} />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || !title || !startAt}
        style={{
          width: '100%',
          background: 'var(--accent)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius-lg)',
          padding: '14px',
          fontSize: '15px',
          fontWeight: 700,
          cursor: 'pointer',
          opacity: (submitting || !title || !startAt) ? 0.5 : 1,
          fontFamily: 'var(--font-playfair)',
          letterSpacing: '-0.01em',
        }}
      >
        {submitting ? 'Submitting…' : 'Submit for review →'}
      </button>
      <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-subtle)' }}>
        Events are reviewed by a moderator before going live
      </p>
    </form>
  )
}
