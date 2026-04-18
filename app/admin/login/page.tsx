'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/admin` },
    })

    if (authError) {
      setError(authError.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '360px', width: '100%', textAlign: 'center' }}>
          <div style={{
            width: '56px', height: '56px',
            background: 'var(--accent-bg)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px',
            margin: '0 auto 20px',
          }}>✉</div>
          <h1 style={{
            fontFamily: 'var(--font-playfair)',
            fontSize: '22px',
            fontWeight: 700,
            color: 'var(--text)',
            marginBottom: '8px',
          }}>Check your email</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            We sent a magic link to <strong style={{ color: 'var(--text)' }}>{email}</strong>. Click it to log in.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Header */}
      <header style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link
            href="/"
            style={{
              fontFamily: 'var(--font-playfair)',
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--text)',
              textDecoration: 'none',
            }}
          >
            ← SiT Calendar
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div style={{ maxWidth: '400px', margin: '80px auto', padding: '0 16px' }}>
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '32px',
          boxShadow: 'var(--shadow-md)',
        }}>
          <h1 style={{
            fontFamily: 'var(--font-playfair)',
            fontSize: '22px',
            fontWeight: 700,
            color: 'var(--text)',
            marginBottom: '6px',
          }}>Moderator login</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
            Enter your email and we&apos;ll send a magic link.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{
                width: '100%',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                fontSize: '14px',
                background: 'var(--surface)',
                color: 'var(--text)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />

            {error && (
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
              }}>
                <p style={{ fontSize: '13px', color: '#991B1B' }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              style={{
                width: '100%',
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: '11px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                opacity: (loading || !email.trim()) ? 0.5 : 1,
                fontFamily: 'var(--font-playfair)',
              }}
            >
              {loading ? 'Sending…' : 'Send magic link →'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
