'use client'

import { useState } from 'react'
import type { PendingEvent } from '@/types/event'
import { ConfirmForm } from './ConfirmForm'
import type { ExtractedEvent } from '@/types/event'

interface ModCardProps {
  event: PendingEvent
  duplicateTitle?: string
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onEdit: (id: string, data: Partial<PendingEvent>) => void
}

function timeSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  Free: { bg: '#F0FDF4', text: '#166534' },
  Networking: { bg: '#FAF5FF', text: '#6B21A8' },
  Tech: { bg: '#EFF6FF', text: '#1D4ED8' },
  AI: { bg: '#EFF6FF', text: '#1D4ED8' },
  Learning: { bg: '#FFF7ED', text: '#9A3412' },
  Wellness: { bg: '#FDF4FF', text: '#7E22CE' },
  Community: { bg: '#ECFDF5', text: '#065F46' },
}

function tagStyle(tag: string): React.CSSProperties {
  const colors = TAG_COLORS[tag] ?? { bg: 'var(--surface-2)', text: 'var(--text-muted)' }
  return {
    background: colors.bg,
    color: colors.text,
    padding: '2px 8px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 500,
  }
}

export function ModCard({ event, duplicateTitle, onApprove, onReject, onEdit }: ModCardProps) {
  const [editing, setEditing] = useState(false)

  function handleEditSubmit(
    data: ExtractedEvent & { submitter_name: string; submitter_email: string }
  ) {
    onEdit(event.id, {
      title: data.title,
      start_at: data.start_at,
      end_at: data.end_at,
      location: data.location,
      description: data.description,
      rsvp_url: data.rsvp_url,
      image_url: data.image_url,
      tags: data.tags,
    })
    setEditing(false)
  }

  const submitterLine = [
    timeSince(event.submitted_at),
    event.submitter_name && `via ${event.submitter_name}`,
    event.submitter_email && `(${event.submitter_email})`,
  ].filter(Boolean).join(' · ')

  return (
    <div style={{
      border: `1px solid ${duplicateTitle ? '#FCA5A5' : 'var(--border)'}`,
      borderRadius: 'var(--radius-xl)',
      overflow: 'hidden',
      background: 'var(--surface)',
      boxShadow: 'var(--shadow-sm)',
    }}>
      {/* Card header band */}
      <div style={{
        background: duplicateTitle ? '#FEF2F2' : 'var(--surface-2)',
        borderBottom: `1px solid ${duplicateTitle ? '#FCA5A5' : 'var(--border)'}`,
        padding: '8px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
      }}>
        <span style={{
          fontSize: '11px',
          fontWeight: 700,
          color: duplicateTitle ? '#991B1B' : 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          {duplicateTitle ? '⚠ Possible duplicate · ' : ''}{submitterLine}
        </span>
        {event.rsvp_url && (
          <a
            href={event.rsvp_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '11px', color: 'var(--accent)', textDecoration: 'none', flexShrink: 0, fontWeight: 600 }}
          >
            View source ↗
          </a>
        )}
      </div>

      {editing ? (
        <div style={{ padding: '16px' }}>
          <ConfirmForm
            draft={{
              title: event.title,
              start_at: event.start_at,
              end_at: event.end_at,
              location: event.location ?? '',
              description: event.description ?? '',
              rsvp_url: event.rsvp_url ?? '',
              image_url: event.image_url,
              tags: event.tags,
              extraction_partial: false,
            }}
            onSubmit={handleEditSubmit}
            submitting={false}
          />
          <button
            onClick={() => setEditing(false)}
            style={{
              marginTop: '8px',
              fontSize: '13px',
              color: 'var(--text-subtle)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 0',
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          <div style={{ padding: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '5px', fontFamily: 'var(--font-playfair)' }}>
              {event.title}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
              ⏰{' '}
              {new Date(event.start_at).toLocaleDateString('en-SG', {
                weekday: 'short', day: 'numeric', month: 'short',
                hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Singapore',
              })}
              {event.location && <span> · 📍 {event.location}</span>}
            </p>
            {event.description && (
              <p style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                marginBottom: '10px',
                lineHeight: 1.5,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {event.description}
              </p>
            )}
            {event.tags.length > 0 && (
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '4px' }}>
                {event.tags.map((tag) => (
                  <span key={tag} style={tagStyle(tag)}>{tag}</span>
                ))}
              </div>
            )}
            {duplicateTitle && (
              <div style={{
                marginTop: '10px',
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px',
              }}>
                <p style={{ fontSize: '12px', color: '#991B1B' }}>
                  Similar event already submitted: <strong>{duplicateTitle}</strong>
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{
            padding: '12px 14px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
          }}>
            <button
              onClick={() => onApprove(event.id)}
              style={{
                background: '#059669',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '7px 14px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ✓ Approve
            </button>
            <button
              onClick={() => onReject(event.id)}
              style={{
                background: '#DC2626',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '7px 14px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ✕ Reject
            </button>
            <button
              onClick={() => setEditing(true)}
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '7px 14px',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              ✎ Edit first
            </button>
          </div>
        </>
      )}
    </div>
  )
}
