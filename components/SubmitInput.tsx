'use client'

import { useState, useRef, type DragEvent } from 'react'

interface SubmitInputProps {
  onUrl: (url: string) => void
  onImage: (file: File) => void
  loading: boolean
}

export function SubmitInput({ onUrl, onImage, loading }: SubmitInputProps) {
  const [url, setUrl] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (url.trim()) onUrl(url.trim())
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) onImage(file)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onImage(file)
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-xl)',
        padding: '36px 28px',
        background: dragOver ? 'var(--accent-bg)' : 'var(--surface)',
        textAlign: 'center',
        transition: 'border-color 0.2s, background 0.2s',
        position: 'relative',
      }}
    >
      {/* Loading overlay */}
      {loading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--surface)',
          borderRadius: 'var(--radius-xl)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          zIndex: 10,
          opacity: 0.95,
        }}>
          <div style={{
            width: '32px', height: '32px',
            border: '3px solid var(--border)',
            borderTop: '3px solid var(--accent)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500 }}>Extracting event details…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      <div style={{ fontSize: '28px', marginBottom: '10px' }}>🔗</div>
      <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '18px', lineHeight: 1.5 }}>
        Paste a URL from Luma, Eventbrite, Meetup, LinkedIn…
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', maxWidth: '440px', margin: '0 auto 18px' }}>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://lu.ma/…"
          disabled={loading}
          aria-label="Event URL"
          style={{
            flex: 1,
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            fontSize: '14px',
            background: 'var(--surface)',
            color: 'var(--text)',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={!url.trim() || loading}
          style={{
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            opacity: (!url.trim() || loading) ? 0.5 : 1,
          }}
        >
          Extract →
        </button>
      </form>

      <p style={{ fontSize: '12px', color: 'var(--text-subtle)', marginBottom: '14px' }}>— or —</p>

      {/* Image upload — keyboard accessible button */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={loading}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click() } }}
        aria-label="Upload a poster image"
        style={{
          border: '1px dashed var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 20px',
          background: 'var(--surface-2)',
          cursor: 'pointer',
          fontSize: '13px',
          color: 'var(--text-muted)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          opacity: loading ? 0.5 : 1,
        }}
      >
        <span>📷</span>
        Drop a poster image here, or{' '}
        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>click to upload</span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  )
}
