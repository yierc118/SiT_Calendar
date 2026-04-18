# SiT Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a community event calendar where members submit events via URL or image, an LLM extracts details, and moderators approve before publishing.

**Architecture:** Single Next.js 14 App Router app deployed to Vercel. Supabase handles Postgres, file storage, and magic-link auth. Extraction runs in a Next.js API route using a 3-tier pipeline: direct URL fetch → Brave Search fallback → manual. UI is Tailwind only.

**Tech Stack:** Next.js 14, TypeScript strict, Supabase (supabase-js + SSR), Google Gemini API (`@google/generative-ai`), Brave Search API, Tailwind CSS, Vitest + React Testing Library

---

## File Map

```
sit-calendar/
├── app/
│   ├── layout.tsx                        # Root layout, global styles
│   ├── page.tsx                          # Public browse page (list + month views)
│   ├── submit/
│   │   ├── page.tsx                      # Step 1: URL/image input
│   │   └── confirm/
│   │       └── page.tsx                  # Step 2: editable confirmation form
│   ├── admin/
│   │   ├── page.tsx                      # Moderator queue (protected)
│   │   └── login/
│   │       └── page.tsx                  # Magic link login
│   └── api/
│       ├── extract/
│       │   └── route.ts                  # POST: LLM extraction endpoint
│       └── events/
│           └── [id]/
│               └── ics/
│                   └── route.ts          # GET: per-event .ics download
├── components/
│   ├── EventCard.tsx                     # List-view event card
│   ├── CalendarGrid.tsx                  # Month-view calendar grid
│   ├── SaveToCalendarMenu.tsx            # Google/Outlook/Apple dropdown
│   ├── SubmitInput.tsx                   # Unified URL paste + image drop zone
│   ├── ConfirmForm.tsx                   # Editable confirmation form
│   └── ModCard.tsx                       # Moderation queue card
├── lib/
│   ├── supabase/
│   │   ├── client.ts                     # Browser Supabase client
│   │   ├── server.ts                     # Server Supabase client (RSC/API routes)
│   │   └── schema.sql                    # DB schema (run once in Supabase dashboard)
│   ├── extraction/
│   │   ├── types.ts                      # ExtractionResult type
│   │   ├── gemini.ts                     # Gemini API wrapper (text + vision)
│   │   ├── fetch-url.ts                  # Tier 1: direct fetch
│   │   ├── brave-search.ts               # Tier 2: Brave Search fallback
│   │   └── extract.ts                    # Orchestrator: runs tiers in order
│   ├── calendar/
│   │   ├── google.ts                     # Google Calendar URL builder
│   │   ├── outlook.ts                    # Outlook URL builder
│   │   └── ics.ts                        # .ics string generator
│   └── duplicates.ts                     # Duplicate detection query
├── types/
│   └── event.ts                          # Shared Event + ExtractedEvent types
├── middleware.ts                          # Protects /admin/* routes
├── vitest.config.ts
├── vitest.setup.ts
└── .env.example
```

---

## Task 1: Project Bootstrap

**Files:**
- Create: `package.json` (via npx)
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `.env.example`
- Create: `.gitignore`

- [ ] **Step 1: Scaffold Next.js app**

```bash
cd /Users/yiercao/Vibe_Coding/SiT_Calendar
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*"
```

Accept all defaults. When prompted for the project name, enter `.` to use the current directory.

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr @google/generative-ai
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 3: Create vitest config**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

Create `vitest.setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Add test script to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Create .env.example**

Create `.env.example`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
BRAVE_SEARCH_API_KEY=your-brave-search-api-key
```

Create `.env.local` by copying `.env.example` and filling in real values.

- [ ] **Step 6: Update .gitignore**

Append to `.gitignore`:
```
.env.local
.env.*.local
.superpowers/
```

- [ ] **Step 7: Verify setup**

```bash
npm run build
```
Expected: Build succeeds with no errors.

- [ ] **Step 8: Commit**

```bash
git init
git add package.json package-lock.json tsconfig.json vitest.config.ts vitest.setup.ts .env.example .gitignore next.config.* tailwind.config.* postcss.config.*
git commit -m "bootstrap next.js app with vitest and supabase deps"
```

---

## Task 2: Database Schema and Shared Types

**Files:**
- Create: `lib/supabase/schema.sql`
- Create: `types/event.ts`

- [ ] **Step 1: Write schema SQL**

Create `lib/supabase/schema.sql`:
```sql
-- Events submitted by community members
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  location TEXT,
  description TEXT,
  rsvp_url TEXT,
  image_url TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  submitter_name TEXT,
  submitter_email TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by TEXT
);

-- Moderator allowlist — email must match Supabase auth user
CREATE TABLE moderators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL
);

-- Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderators ENABLE ROW LEVEL SECURITY;

-- Public: read approved events only
CREATE POLICY "public_read_approved" ON events
  FOR SELECT USING (status = 'approved');

-- Anyone: submit new events (pending only)
CREATE POLICY "anyone_submit_event" ON events
  FOR INSERT WITH CHECK (status = 'pending');

-- Moderators: full access
CREATE POLICY "moderator_full_access" ON events
  FOR ALL USING (
    auth.email() IN (SELECT email FROM moderators)
  );

-- Moderators: read their own record
CREATE POLICY "moderator_read_self" ON moderators
  FOR SELECT USING (auth.email() = email);

-- Index for duplicate detection
CREATE INDEX events_rsvp_url_idx ON events (rsvp_url)
  WHERE rsvp_url IS NOT NULL;

-- Index for browse page (upcoming approved events)
CREATE INDEX events_status_start_idx ON events (status, start_at);
```

Run this SQL in the Supabase dashboard (SQL editor) for your project.

- [ ] **Step 2: Write shared TypeScript types**

Create `types/event.ts`:
```typescript
export type EventStatus = 'pending' | 'approved' | 'rejected'

export interface Event {
  id: string
  title: string
  start_at: string // ISO 8601, UTC
  end_at: string | null
  location: string | null
  description: string | null
  rsvp_url: string | null
  image_url: string | null
  tags: string[]
  status: EventStatus
  submitter_name: string | null
  submitter_email: string | null
  submitted_at: string
  approved_at: string | null
  approved_by: string | null
}

export type ApprovedEvent = Event & { status: 'approved' }
export type PendingEvent = Event & { status: 'pending' }

/** Shape returned by /api/extract before saving to DB */
export interface ExtractedEvent {
  title: string
  start_at: string // ISO 8601, UTC
  end_at: string | null
  location: string
  description: string
  rsvp_url: string
  image_url: string | null
  tags: string[]
  extraction_partial: boolean
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/schema.sql types/event.ts
git commit -m "add db schema and shared event types"
```

---

## Task 3: Supabase Clients

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`

- [ ] **Step 1: Write browser client**

Create `lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Write server client**

Create `lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
}

/** Service-role client for API routes that bypass RLS */
export function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/client.ts lib/supabase/server.ts
git commit -m "add supabase browser and server clients"
```

---

## Task 4: Auth Middleware and Admin Login Page

**Files:**
- Create: `middleware.ts`
- Create: `app/admin/login/page.tsx`

- [ ] **Step 1: Write middleware to protect /admin**

Create `middleware.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    return NextResponse.redirect(url)
  }

  // Verify the user's email is in the moderators table
  const { data: moderator } = await supabase
    .from('moderators')
    .select('email')
    .eq('email', user.email ?? '')
    .single()

  if (!moderator) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    url.searchParams.set('error', 'not_authorised')
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*'],
}
```

- [ ] **Step 2: Write admin login page**

Create `app/admin/login/page.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          <h1 className="text-2xl font-bold mb-2">Check your email</h1>
          <p className="text-gray-500">
            We sent a magic link to <strong>{email}</strong>. Click it to log in.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-sm w-full">
        <h1 className="text-2xl font-bold mb-1">Moderator login</h1>
        <p className="text-gray-500 text-sm mb-6">
          Enter your email and we&apos;ll send a magic link.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? 'Sending…' : 'Send magic link'}
          </button>
        </form>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Smoke test — verify build**

```bash
npm run build
```
Expected: Build succeeds. No TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add middleware.ts app/admin/login/page.tsx
git commit -m "add admin auth: magic link login and route protection middleware"
```

---

## Task 5: Extraction Types and Gemini Wrapper

**Files:**
- Create: `lib/extraction/types.ts`
- Create: `lib/extraction/gemini.ts`
- Create: `lib/extraction/gemini.test.ts`

- [ ] **Step 1: Write extraction types**

Create `lib/extraction/types.ts`:
```typescript
export interface RawExtraction {
  title: string
  start_at: string
  end_at: string | null
  location: string
  description: string
  rsvp_url: string
  image_url: string | null
  tags: string[]
}

export const EXTRACTION_PROMPT = `
You are an event data extractor. Extract structured event information from the content below.

Return ONLY a valid JSON object with exactly these fields (no markdown, no explanation):
{
  "title": "event title as a string",
  "start_at": "ISO 8601 datetime string in UTC, e.g. 2026-04-07T10:30:00Z. If year is ambiguous, use the nearest upcoming date.",
  "end_at": "ISO 8601 datetime string in UTC, or null if not found",
  "location": "venue name and address, or 'Online' if virtual",
  "description": "brief description of the event, max 300 chars",
  "rsvp_url": "the event registration or source URL",
  "image_url": "URL of the event cover image if found, or null",
  "tags": ["array", "of", "2-5", "relevant", "keyword", "tags"]
}

If a field cannot be determined, use an empty string "" (not null) except for end_at and image_url which may be null.
`.trim()
```

- [ ] **Step 2: Write failing test for Gemini wrapper**

Create `lib/extraction/gemini.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the @google/generative-ai module
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            title: 'Test Event',
            start_at: '2026-04-07T10:30:00Z',
            end_at: '2026-04-07T13:00:00Z',
            location: 'Test Venue, Singapore',
            description: 'A test event description.',
            rsvp_url: 'https://lu.ma/test-event',
            image_url: null,
            tags: ['tech', 'networking'],
          }),
        },
      }),
    }),
  })),
}))

import { extractFromText } from './gemini'

describe('extractFromText', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key'
  })

  it('parses valid JSON response from Gemini', async () => {
    const result = await extractFromText('some event content')
    expect(result.title).toBe('Test Event')
    expect(result.start_at).toBe('2026-04-07T10:30:00Z')
    expect(result.tags).toEqual(['tech', 'networking'])
  })

  it('throws if Gemini returns invalid JSON', async () => {
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const mockGenAI = GoogleGenerativeAI as ReturnType<typeof vi.fn>
    mockGenAI.mockImplementationOnce(() => ({
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: vi.fn().mockResolvedValue({
          response: { text: () => 'not json' },
        }),
      }),
    }))

    await expect(extractFromText('bad content')).rejects.toThrow()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx vitest run lib/extraction/gemini.test.ts
```
Expected: FAIL — `extractFromText` is not defined.

- [ ] **Step 4: Write Gemini wrapper**

Create `lib/extraction/gemini.ts`:
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'
import { type RawExtraction, EXTRACTION_PROMPT } from './types'

function getModel() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
}

function parseExtractionResponse(text: string): RawExtraction {
  // Strip markdown code blocks if Gemini wraps the JSON
  const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
  const parsed = JSON.parse(cleaned) as RawExtraction
  if (!parsed.title || !parsed.start_at) {
    throw new Error('Extraction missing required fields: title or start_at')
  }
  return parsed
}

/** Extract event details from a text string (HTML content or search snippets) */
export async function extractFromText(content: string): Promise<RawExtraction> {
  const model = getModel()
  const prompt = `${EXTRACTION_PROMPT}\n\nContent:\n${content.slice(0, 12000)}`
  const result = await model.generateContent(prompt)
  return parseExtractionResponse(result.response.text())
}

/** Extract event details from an image (base64-encoded) */
export async function extractFromImage(
  base64Data: string,
  mimeType: string
): Promise<RawExtraction> {
  const model = getModel()
  const result = await model.generateContent([
    { inlineData: { mimeType, data: base64Data } },
    EXTRACTION_PROMPT,
  ])
  return parseExtractionResponse(result.response.text())
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run lib/extraction/gemini.test.ts
```
Expected: PASS — 2 tests passing.

- [ ] **Step 6: Commit**

```bash
git add lib/extraction/types.ts lib/extraction/gemini.ts lib/extraction/gemini.test.ts
git commit -m "add gemini extraction wrapper with text and vision support"
```

---

## Task 6: URL Fetch (Tier 1)

**Files:**
- Create: `lib/extraction/fetch-url.ts`
- Create: `lib/extraction/fetch-url.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/extraction/fetch-url.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { fetchUrlContent } from './fetch-url'

describe('fetchUrlContent', () => {
  it('returns text content when fetch succeeds with enough content', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '<html><body>' + 'a'.repeat(500) + '</body></html>',
    }) as unknown as typeof fetch

    const result = await fetchUrlContent('https://lu.ma/test')
    expect(result).not.toBeNull()
    expect(result!.length).toBeGreaterThan(200)
  })

  it('returns null when fetch fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const result = await fetchUrlContent('https://example.com')
    expect(result).toBeNull()
  })

  it('returns null when response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
    }) as unknown as typeof fetch

    const result = await fetchUrlContent('https://linkedin.com/events/123')
    expect(result).toBeNull()
  })

  it('returns null when stripped content is under 200 chars', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '<html><head><title>Hi</title></head></html>',
    }) as unknown as typeof fetch

    const result = await fetchUrlContent('https://example.com')
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run lib/extraction/fetch-url.test.ts
```
Expected: FAIL — `fetchUrlContent` is not defined.

- [ ] **Step 3: Implement fetch-url**

Create `lib/extraction/fetch-url.ts`:
```typescript
const MIN_CONTENT_LENGTH = 200
const MAX_CONTENT_LENGTH = 12000
const FETCH_TIMEOUT_MS = 10000

/** Strip HTML tags and collapse whitespace */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Fetches a URL and returns plain text content.
 * Returns null if the fetch fails or content is insufficient.
 */
export async function fetchUrlContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; SiTCalendarBot/1.0; +https://sit-calendar.vercel.app)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })

    if (!response.ok) return null

    const html = await response.text()
    const text = htmlToText(html)

    if (text.length < MIN_CONTENT_LENGTH) return null

    return text.slice(0, MAX_CONTENT_LENGTH)
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
npx vitest run lib/extraction/fetch-url.test.ts
```
Expected: PASS — 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add lib/extraction/fetch-url.ts lib/extraction/fetch-url.test.ts
git commit -m "add tier-1 url fetch for extraction pipeline"
```

---

## Task 7: Brave Search Fallback (Tier 2)

**Files:**
- Create: `lib/extraction/brave-search.ts`
- Create: `lib/extraction/brave-search.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/extraction/brave-search.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { searchBrave } from './brave-search'

beforeEach(() => {
  process.env.BRAVE_SEARCH_API_KEY = 'test-brave-key'
})

describe('searchBrave', () => {
  it('returns combined snippets from search results', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        web: {
          results: [
            { title: 'Women in Tech Meetup', description: 'A great networking event.' },
            { title: 'WiT Singapore', description: 'Monthly gatherings for women in tech.' },
          ],
        },
      }),
    }) as unknown as typeof fetch

    const result = await searchBrave('https://linkedin.com/events/123')
    expect(result).toContain('Women in Tech Meetup')
    expect(result).toContain('networking event')
  })

  it('returns null when fetch fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const result = await searchBrave('https://example.com')
    expect(result).toBeNull()
  })

  it('returns null when no results found', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ web: { results: [] } }),
    }) as unknown as typeof fetch

    const result = await searchBrave('https://example.com/obscure')
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run lib/extraction/brave-search.test.ts
```
Expected: FAIL — `searchBrave` is not defined.

- [ ] **Step 3: Implement brave-search**

Create `lib/extraction/brave-search.ts`:
```typescript
const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search'

/**
 * Searches Brave for the given query (typically a URL) and returns
 * concatenated title + description snippets for Gemini to extract from.
 * Returns null if the search fails or returns no results.
 */
export async function searchBrave(query: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({ q: query, count: '3' })
    const response = await fetch(`${BRAVE_API_URL}?${params}`, {
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY!,
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) return null

    const data = await response.json() as {
      web?: { results?: Array<{ title: string; description: string }> }
    }
    const results = data.web?.results ?? []

    if (results.length === 0) return null

    return results
      .map((r) => `${r.title}\n${r.description}`)
      .join('\n\n')
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
npx vitest run lib/extraction/brave-search.test.ts
```
Expected: PASS — 3 tests passing.

- [ ] **Step 5: Commit**

```bash
git add lib/extraction/brave-search.ts lib/extraction/brave-search.test.ts
git commit -m "add tier-2 brave search fallback for extraction pipeline"
```

---

## Task 8: Extraction Orchestrator and API Route

**Files:**
- Create: `lib/extraction/extract.ts`
- Create: `lib/extraction/extract.test.ts`
- Create: `app/api/extract/route.ts`

- [ ] **Step 1: Write failing tests for orchestrator**

Create `lib/extraction/extract.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./fetch-url', () => ({
  fetchUrlContent: vi.fn(),
}))
vi.mock('./brave-search', () => ({
  searchBrave: vi.fn(),
}))
vi.mock('./gemini', () => ({
  extractFromText: vi.fn(),
  extractFromImage: vi.fn(),
}))

import { extractFromUrl } from './extract'
import { fetchUrlContent } from './fetch-url'
import { searchBrave } from './brave-search'
import { extractFromText } from './gemini'

const mockExtraction = {
  title: 'Test Event',
  start_at: '2026-04-07T10:30:00Z',
  end_at: null,
  location: 'Singapore',
  description: 'A test event.',
  rsvp_url: 'https://lu.ma/test',
  image_url: null,
  tags: ['tech'],
}

describe('extractFromUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses tier 1 (direct fetch) when content is available', async () => {
    vi.mocked(fetchUrlContent).mockResolvedValue('rich page content about the event')
    vi.mocked(extractFromText).mockResolvedValue(mockExtraction)

    const result = await extractFromUrl('https://lu.ma/test')

    expect(fetchUrlContent).toHaveBeenCalledWith('https://lu.ma/test')
    expect(searchBrave).not.toHaveBeenCalled()
    expect(result.extraction_partial).toBe(false)
    expect(result.title).toBe('Test Event')
  })

  it('falls back to brave search when fetch returns null', async () => {
    vi.mocked(fetchUrlContent).mockResolvedValue(null)
    vi.mocked(searchBrave).mockResolvedValue('snippets from brave')
    vi.mocked(extractFromText).mockResolvedValue(mockExtraction)

    const result = await extractFromUrl('https://linkedin.com/events/123')

    expect(searchBrave).toHaveBeenCalledWith('https://linkedin.com/events/123')
    expect(result.extraction_partial).toBe(false)
  })

  it('returns partial result when both tiers fail', async () => {
    vi.mocked(fetchUrlContent).mockResolvedValue(null)
    vi.mocked(searchBrave).mockResolvedValue(null)

    const result = await extractFromUrl('https://unknown.com/event')

    expect(result.extraction_partial).toBe(true)
    expect(result.rsvp_url).toBe('https://unknown.com/event')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run lib/extraction/extract.test.ts
```
Expected: FAIL — `extractFromUrl` is not defined.

- [ ] **Step 3: Write extraction orchestrator**

Create `lib/extraction/extract.ts`:
```typescript
import type { ExtractedEvent } from '@/types/event'
import { fetchUrlContent } from './fetch-url'
import { searchBrave } from './brave-search'
import { extractFromText, extractFromImage } from './gemini'

/** Orchestrates 3-tier URL extraction. Never throws — returns partial on total failure. */
export async function extractFromUrl(url: string): Promise<ExtractedEvent> {
  // Tier 1: direct fetch
  const fetchedContent = await fetchUrlContent(url)
  if (fetchedContent) {
    try {
      const raw = await extractFromText(fetchedContent)
      return { ...raw, rsvp_url: raw.rsvp_url || url, extraction_partial: false }
    } catch {
      // fall through to tier 2
    }
  }

  // Tier 2: Brave Search fallback
  const searchContent = await searchBrave(url)
  if (searchContent) {
    try {
      const raw = await extractFromText(searchContent)
      return { ...raw, rsvp_url: raw.rsvp_url || url, extraction_partial: false }
    } catch {
      // fall through to tier 3
    }
  }

  // Tier 3: manual fallback — return empty fields with the URL
  return {
    title: '',
    start_at: '',
    end_at: null,
    location: '',
    description: '',
    rsvp_url: url,
    image_url: null,
    tags: [],
    extraction_partial: true,
  }
}

/** Extracts event details from a base64-encoded image. */
export async function extractFromImageData(
  base64Data: string,
  mimeType: string,
  imageUrl: string
): Promise<ExtractedEvent> {
  try {
    const raw = await extractFromImage(base64Data, mimeType)
    return { ...raw, image_url: raw.image_url || imageUrl, extraction_partial: false }
  } catch {
    return {
      title: '',
      start_at: '',
      end_at: null,
      location: '',
      description: '',
      rsvp_url: '',
      image_url: imageUrl,
      tags: [],
      extraction_partial: true,
    }
  }
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
npx vitest run lib/extraction/extract.test.ts
```
Expected: PASS — 3 tests passing.

- [ ] **Step 5: Write the API route**

Create `app/api/extract/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { extractFromUrl, extractFromImageData } from '@/lib/extraction/extract'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') ?? ''

    if (contentType.includes('application/json')) {
      // URL extraction
      const { url } = await request.json() as { url: string }
      if (!url || typeof url !== 'string') {
        return NextResponse.json({ error: 'url is required' }, { status: 400 })
      }

      const result = await extractFromUrl(url)
      return NextResponse.json(result)
    }

    if (contentType.includes('multipart/form-data')) {
      // Image extraction
      const formData = await request.formData()
      const file = formData.get('image') as File | null

      if (!file) {
        return NextResponse.json({ error: 'image is required' }, { status: 400 })
      }

      // Upload image to Supabase Storage
      const supabase = createServiceClient()
      const fileName = `uploads/${Date.now()}-${file.name}`
      const arrayBuffer = await file.arrayBuffer()
      const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(fileName, arrayBuffer, { contentType: file.type, upsert: false })

      if (uploadError) {
        return NextResponse.json({ error: 'Image upload failed' }, { status: 500 })
      }

      const { data: { publicUrl } } = supabase.storage
        .from('event-images')
        .getPublicUrl(fileName)

      // Convert to base64 for Gemini Vision
      const bytes = new Uint8Array(arrayBuffer)
      const base64 = Buffer.from(bytes).toString('base64')

      const result = await extractFromImageData(base64, file.type, publicUrl)
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Unsupported content type' }, { status: 415 })
  } catch (err) {
    console.error('[/api/extract]', err)
    return NextResponse.json({ error: 'Extraction failed' }, { status: 500 })
  }
}
```

Note: Create a public bucket named `event-images` in the Supabase Storage dashboard before testing this route.

- [ ] **Step 6: Run all extraction tests**

```bash
npx vitest run lib/extraction/
```
Expected: PASS — all tests in the extraction folder passing.

- [ ] **Step 7: Commit**

```bash
git add lib/extraction/extract.ts lib/extraction/extract.test.ts app/api/extract/route.ts
git commit -m "add extraction orchestrator (3-tier) and /api/extract route"
```

---

## Task 9: Duplicate Detection

**Files:**
- Create: `lib/duplicates.ts`
- Create: `lib/duplicates.test.ts`
- Create: `app/api/check-duplicate/route.ts`

Note: `lib/duplicates.ts` is server-only (uses service client). Client components must call `/api/check-duplicate` — never import `lib/duplicates` directly in a `'use client'` file.

- [ ] **Step 1: Write failing tests**

Create `lib/duplicates.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { checkDuplicate } from './duplicates'

const mockEvent = {
  id: 'abc-123',
  title: 'Women in Tech Meetup',
  start_at: '2026-04-07T10:30:00Z',
  end_at: null,
  location: 'WeWork Funan',
  description: 'Networking event.',
  rsvp_url: 'https://lu.ma/test-event',
  image_url: null,
  tags: ['networking'],
  status: 'approved' as const,
  submitter_name: null,
  submitter_email: null,
  submitted_at: '2026-04-01T10:00:00Z',
  approved_at: '2026-04-01T11:00:00Z',
  approved_by: 'mod@sit.sg',
}

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockEvent, error: null }),
    }),
  }),
}))

describe('checkDuplicate', () => {
  it('returns the existing event when a matching rsvp_url is found', async () => {
    const result = await checkDuplicate('https://lu.ma/test-event')
    expect(result).not.toBeNull()
    expect(result!.id).toBe('abc-123')
  })

  it('returns null for a null url', async () => {
    const result = await checkDuplicate(null)
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run lib/duplicates.test.ts
```
Expected: FAIL — `checkDuplicate` is not defined.

- [ ] **Step 3: Implement duplicate detection**

Create `lib/duplicates.ts`:
```typescript
import { createServiceClient } from '@/lib/supabase/server'
import type { Event } from '@/types/event'

/**
 * Server-only. Checks if an event with the same rsvp_url already exists
 * (pending or approved). Returns the matching event or null.
 * Image submissions (no URL) always return null.
 */
export async function checkDuplicate(rsvpUrl: string | null | undefined): Promise<Event | null> {
  if (!rsvpUrl) return null

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('rsvp_url', rsvpUrl)
    .in('status', ['pending', 'approved'])
    .single()

  if (error || !data) return null
  return data as Event
}
```

- [ ] **Step 4: Write the check-duplicate API route**

Create `app/api/check-duplicate/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { checkDuplicate } from '@/lib/duplicates'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ duplicate: null })
  }

  const existing = await checkDuplicate(url)

  if (!existing) {
    return NextResponse.json({ duplicate: null })
  }

  return NextResponse.json({
    duplicate: { id: existing.id, title: existing.title },
  })
}
```

- [ ] **Step 5: Run tests to verify pass**

```bash
npx vitest run lib/duplicates.test.ts
```
Expected: PASS — 2 tests passing.

- [ ] **Step 6: Commit**

```bash
git add lib/duplicates.ts lib/duplicates.test.ts app/api/check-duplicate/route.ts
git commit -m "add duplicate detection by rsvp_url with api route for client use"
```

---

## Task 10: Calendar Export Utilities

**Files:**
- Create: `lib/calendar/google.ts`
- Create: `lib/calendar/outlook.ts`
- Create: `lib/calendar/ics.ts`
- Create: `lib/calendar/calendar.test.ts`
- Create: `app/api/events/[id]/ics/route.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/calendar/calendar.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { buildGoogleCalendarUrl } from './google'
import { buildOutlookCalendarUrl } from './outlook'
import { generateIcs } from './ics'
import type { ApprovedEvent } from '@/types/event'

const event: ApprovedEvent = {
  id: 'evt-1',
  title: 'Women in Tech Meetup',
  start_at: '2026-04-07T10:30:00Z',
  end_at: '2026-04-07T13:00:00Z',
  location: 'WeWork Funan, Singapore',
  description: 'Networking event for women in tech.',
  rsvp_url: 'https://lu.ma/wit-sg',
  image_url: null,
  tags: ['networking'],
  status: 'approved',
  submitter_name: 'Priya R.',
  submitter_email: null,
  submitted_at: '2026-04-01T10:00:00Z',
  approved_at: '2026-04-01T11:00:00Z',
  approved_by: 'mod@sit.sg',
}

describe('buildGoogleCalendarUrl', () => {
  it('contains required query params', () => {
    const url = buildGoogleCalendarUrl(event)
    expect(url).toContain('calendar.google.com')
    expect(url).toContain('Women+in+Tech+Meetup')
    expect(url).toContain('20260407T103000Z')
    expect(url).toContain('WeWork+Funan')
  })
})

describe('buildOutlookCalendarUrl', () => {
  it('contains required query params', () => {
    const url = buildOutlookCalendarUrl(event)
    expect(url).toContain('outlook.live.com')
    expect(url).toContain('Women+in+Tech+Meetup')
  })
})

describe('generateIcs', () => {
  it('produces valid .ics content', () => {
    const ics = generateIcs(event)
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('BEGIN:VEVENT')
    expect(ics).toContain('DTSTART:20260407T103000Z')
    expect(ics).toContain('SUMMARY:Women in Tech Meetup')
    expect(ics).toContain('END:VEVENT')
    expect(ics).toContain('END:VCALENDAR')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run lib/calendar/calendar.test.ts
```
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement Google Calendar URL builder**

Create `lib/calendar/google.ts`:
```typescript
import type { ApprovedEvent } from '@/types/event'

function toGoogleDatetime(iso: string): string {
  // Convert ISO 8601 UTC to YYYYMMDDTHHMMSSZ
  return iso.replace(/[-:]/g, '').replace('.000Z', 'Z').replace(/\.\d+Z$/, 'Z')
}

function addOneHour(iso: string): string {
  const date = new Date(iso)
  date.setHours(date.getHours() + 1)
  return date.toISOString()
}

export function buildGoogleCalendarUrl(event: ApprovedEvent): string {
  const start = toGoogleDatetime(event.start_at)
  const end = toGoogleDatetime(event.end_at ?? addOneHour(event.start_at))

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${start}/${end}`,
    details: event.description ?? '',
    location: event.location ?? '',
  })
  return `https://calendar.google.com/calendar/render?${params}`
}
```

- [ ] **Step 4: Implement Outlook URL builder**

Create `lib/calendar/outlook.ts`:
```typescript
import type { ApprovedEvent } from '@/types/event'

function addOneHour(iso: string): string {
  const date = new Date(iso)
  date.setHours(date.getHours() + 1)
  return date.toISOString()
}

export function buildOutlookCalendarUrl(event: ApprovedEvent): string {
  const params = new URLSearchParams({
    subject: event.title,
    startdt: event.start_at,
    enddt: event.end_at ?? addOneHour(event.start_at),
    body: event.description ?? '',
    location: event.location ?? '',
  })
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params}`
}
```

- [ ] **Step 5: Implement .ics generator**

Create `lib/calendar/ics.ts`:
```typescript
import type { ApprovedEvent } from '@/types/event'

function toIcsDatetime(iso: string): string {
  return iso.replace(/[-:]/g, '').replace('.000Z', 'Z').replace(/\.\d+Z$/, 'Z')
}

function addOneHour(iso: string): string {
  const date = new Date(iso)
  date.setHours(date.getHours() + 1)
  return date.toISOString()
}

function escapeIcs(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export function generateIcs(event: ApprovedEvent): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SiT Calendar//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@sit-calendar`,
    `DTSTART:${toIcsDatetime(event.start_at)}`,
    `DTEND:${toIcsDatetime(event.end_at ?? addOneHour(event.start_at))}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(event.description ?? '')}`,
    `LOCATION:${escapeIcs(event.location ?? '')}`,
    `URL:${event.rsvp_url ?? ''}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.join('\r\n')
}
```

- [ ] **Step 6: Run tests to verify pass**

```bash
npx vitest run lib/calendar/calendar.test.ts
```
Expected: PASS — 3 tests passing.

- [ ] **Step 7: Write .ics API route**

Create `app/api/events/[id]/ics/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateIcs } from '@/lib/calendar/ics'
import type { ApprovedEvent } from '@/types/event'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .eq('status', 'approved')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  const ics = generateIcs(data as ApprovedEvent)

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="event-${id}.ics"`,
    },
  })
}
```

- [ ] **Step 8: Commit**

```bash
git add lib/calendar/ app/api/events/
git commit -m "add calendar export: google, outlook, apple ics"
```

---

## Task 11: Submit Page

**Files:**
- Create: `components/SubmitInput.tsx`
- Create: `app/submit/page.tsx`

- [ ] **Step 1: Write SubmitInput component**

Create `components/SubmitInput.tsx`:
```typescript
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
      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
        dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-gray-50'
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <p className="text-2xl mb-2">🔗</p>
      <p className="text-sm text-gray-500 mb-4">
        Paste a URL from Luma, Eventbrite, Meetup, LinkedIn&hellip;
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto mb-4">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://lu.ma/…"
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!url.trim() || loading}
          className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? 'Extracting…' : 'Extract →'}
        </button>
      </form>
      <p className="text-xs text-gray-400 mb-3">— or —</p>
      <div
        className="border border-dashed border-gray-300 rounded-lg p-4 bg-white cursor-pointer hover:border-indigo-400 transition-colors inline-block"
        onClick={() => fileInputRef.current?.click()}
      >
        <span className="text-sm text-gray-500">
          📷 Drop a poster image here, or{' '}
          <span className="text-indigo-600 underline">click to upload</span>
        </span>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
```

- [ ] **Step 2: Write submit page**

Create `app/submit/page.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SubmitInput } from '@/components/SubmitInput'
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
      setError('Could not extract event details. Please try again or fill in manually.')
      // Navigate anyway with empty draft so user can fill manually
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
    <main className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Share an event</h1>
        <p className="text-gray-500 text-sm mb-8">
          Paste a link or drop a poster — we&apos;ll fill in the details.
        </p>
        <SubmitInput onUrl={handleUrl} onImage={handleImage} loading={loading} />
        {error && (
          <p className="mt-4 text-sm text-amber-700 bg-amber-50 rounded-lg px-4 py-3">
            {error}
          </p>
        )}
        <p className="mt-6 text-xs text-center text-gray-400">
          Events are reviewed by a moderator before going live
        </p>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```
Expected: Build succeeds. No TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add components/SubmitInput.tsx app/submit/page.tsx
git commit -m "add submit page with unified url/image input"
```

---

## Task 12: Confirm Page

**Files:**
- Create: `components/ConfirmForm.tsx`
- Create: `app/submit/confirm/page.tsx`

- [ ] **Step 1: Write ConfirmForm component**

Create `components/ConfirmForm.tsx`:
```typescript
'use client'

import { useState } from 'react'
import type { ExtractedEvent } from '@/types/event'

interface ConfirmFormProps {
  draft: ExtractedEvent
  onSubmit: (data: ExtractedEvent & { submitter_name: string; submitter_email: string }) => void
  submitting: boolean
}

export function ConfirmForm({ draft, onSubmit, submitting }: ConfirmFormProps) {
  const [title, setTitle] = useState(draft.title)
  const [startAt, setStartAt] = useState(draft.start_at)
  const [endAt, setEndAt] = useState(draft.end_at ?? '')
  const [location, setLocation] = useState(draft.location)
  const [description, setDescription] = useState(draft.description)
  const [tags, setTags] = useState<string[]>(draft.tags)
  const [newTag, setNewTag] = useState('')
  const [rsvpUrl, setRsvpUrl] = useState(draft.rsvp_url)
  const [submitterName, setSubmitterName] = useState('')
  const [submitterEmail, setSubmitterEmail] = useState('')

  function addTag() {
    const trimmed = newTag.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
    }
    setNewTag('')
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      title, start_at: startAt, end_at: endAt || null, location,
      description, rsvp_url: rsvpUrl, image_url: draft.image_url,
      tags, extraction_partial: draft.extraction_partial,
      submitter_name: submitterName, submitter_email: submitterEmail,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {draft.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={draft.image_url}
          alt="Event cover"
          className="w-full h-48 object-cover rounded-xl"
        />
      )}

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
          Event title
        </label>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
            Start
          </label>
          <input
            required
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            placeholder="2026-04-07T18:30:00+08:00"
            className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm text-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <p className="text-xs text-amber-600 mt-1">⚠ Double-check — dates are often misread</p>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
            End (optional)
          </label>
          <input
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            placeholder="2026-04-07T21:00:00+08:00"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
          Location
        </label>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
          Description
        </label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
          Tags
        </label>
        <div className="flex flex-wrap gap-2 items-center">
          {tags.map((tag) => (
            <span
              key={tag}
              className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs flex items-center gap-1"
            >
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500">×</button>
            </span>
          ))}
          <div className="flex gap-1">
            <input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
              placeholder="+ add tag"
              className="border border-dashed border-gray-300 rounded-full px-3 py-1 text-xs focus:outline-none focus:border-indigo-400 w-24"
            />
            <button
              type="button"
              onClick={addTag}
              className="text-indigo-600 text-xs font-semibold"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
          RSVP / source link
        </label>
        <input
          type="url"
          value={rsvpUrl}
          onChange={(e) => setRsvpUrl(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
            Your name (optional)
          </label>
          <input
            value={submitterName}
            onChange={(e) => setSubmitterName(e.target.value)}
            placeholder="Priya R."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
            Your email (optional)
          </label>
          <input
            type="email"
            value={submitterEmail}
            onChange={(e) => setSubmitterEmail(e.target.value)}
            placeholder="for mod follow-up only"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || !title || !startAt}
        className="w-full bg-indigo-600 text-white rounded-xl px-4 py-3 font-semibold text-sm disabled:opacity-50"
      >
        {submitting ? 'Submitting…' : 'Submit for review →'}
      </button>
      <p className="text-xs text-center text-gray-400">
        Events are reviewed by a moderator before going live
      </p>
    </form>
  )
}
```

- [ ] **Step 2: Write confirm page**

Create `app/submit/confirm/page.tsx`:
```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ConfirmForm } from '@/components/ConfirmForm'
import type { ExtractedEvent } from '@/types/event'

export default function ConfirmPage() {
  const router = useRouter()
  const [draft, setDraft] = useState<ExtractedEvent | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
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
      alert('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold mb-2">Thanks!</h1>
          <p className="text-gray-500 mb-6">Your event is under review. It&apos;ll appear on the calendar once approved.</p>
          <a href="/" className="text-indigo-600 text-sm font-semibold">← Back to calendar</a>
        </div>
      </main>
    )
  }

  if (!draft) return null

  return (
    <main className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-xl mx-auto">
        <a href="/submit" className="text-sm text-gray-400 hover:text-gray-600 mb-6 inline-block">← Back</a>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Review event details</h1>
        <p className="text-gray-500 text-sm mb-6">
          We extracted these details — please check and correct anything that looks wrong.
        </p>
        {duplicate && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-sm text-amber-800">
              <strong>This event may already be submitted:</strong>{' '}
              <a href={`/#event-${duplicate.id}`} className="text-indigo-600 underline">
                {duplicate.title}
              </a>
            </p>
          </div>
        )}
        {draft.extraction_partial && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <p className="text-sm text-blue-800">
              We couldn&apos;t extract all details automatically — please fill in the missing fields.
            </p>
          </div>
        )}
        <ConfirmForm draft={draft} onSubmit={handleSubmit} submitting={submitting} />
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Write event submission API route**

Create `app/api/events/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      title: string
      start_at: string
      end_at: string | null
      location: string
      description: string
      rsvp_url: string | null
      image_url: string | null
      tags: string[]
      submitter_name: string | null
      submitter_email: string | null
    }

    if (!body.title || !body.start_at) {
      return NextResponse.json({ error: 'title and start_at are required' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('events')
      .insert({
        title: body.title,
        start_at: body.start_at,
        end_at: body.end_at,
        location: body.location,
        description: body.description,
        rsvp_url: body.rsvp_url,
        image_url: body.image_url,
        tags: body.tags,
        submitter_name: body.submitter_name,
        submitter_email: body.submitter_email,
        status: 'pending',
      })
      .select('id')
      .single()

    if (error) throw error
    return NextResponse.json({ id: data.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/events]', err)
    return NextResponse.json({ error: 'Failed to save event' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add components/ConfirmForm.tsx app/submit/confirm/page.tsx app/api/events/route.ts
git commit -m "add confirm page with editable form and event submission api"
```

---

## Task 13: SaveToCalendar Dropdown and EventCard Component

**Files:**
- Create: `components/SaveToCalendarMenu.tsx`
- Create: `components/EventCard.tsx`

- [ ] **Step 1: Write SaveToCalendarMenu**

Create `components/SaveToCalendarMenu.tsx`:
```typescript
'use client'

import { useState, useRef, useEffect } from 'react'
import { buildGoogleCalendarUrl } from '@/lib/calendar/google'
import { buildOutlookCalendarUrl } from '@/lib/calendar/outlook'
import type { ApprovedEvent } from '@/types/event'

export function SaveToCalendarMenu({ event }: { event: ApprovedEvent }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-emerald-100 transition-colors whitespace-nowrap"
      >
        🗓 Save {open ? '▴' : '▾'}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-20 min-w-[160px]">
          <a
            href={buildGoogleCalendarUrl(event)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => setOpen(false)}
          >
            <span>🔵</span> Google Calendar
          </a>
          <a
            href={buildOutlookCalendarUrl(event)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => setOpen(false)}
          >
            <span>🟦</span> Outlook
          </a>
          <a
            href={`/api/events/${event.id}/ics`}
            download={`${event.title}.ics`}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => setOpen(false)}
          >
            <span>⬜</span> Apple Calendar
          </a>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Write EventCard component**

Create `components/EventCard.tsx`:
```typescript
import { SaveToCalendarMenu } from './SaveToCalendarMenu'
import type { ApprovedEvent } from '@/types/event'

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-SG', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Singapore',
  })
}

const DAY_GRADIENTS = [
  'from-indigo-500 to-purple-500',
  'from-sky-500 to-indigo-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-violet-500 to-purple-600',
  'from-cyan-500 to-sky-500',
]

function getGradient(dateStr: string): string {
  const day = new Date(dateStr).getDay()
  return DAY_GRADIENTS[day]
}

export function EventCard({ event }: { event: ApprovedEvent }) {
  const startDate = new Date(event.start_at)
  const dayName = startDate.toLocaleDateString('en-SG', { weekday: 'short', timeZone: 'Asia/Singapore' })
  const dayNum = startDate.toLocaleDateString('en-SG', { day: 'numeric', timeZone: 'Asia/Singapore' })
  const monthName = startDate.toLocaleDateString('en-SG', { month: 'short', timeZone: 'Asia/Singapore' })
  const startTime = formatTime(event.start_at)
  const endTime = event.end_at ? formatTime(event.end_at) : null

  return (
    <div className="flex border border-gray-200 rounded-2xl overflow-hidden bg-white hover:shadow-md transition-shadow">
      {/* Date block */}
      <div className={`w-24 min-w-[6rem] bg-gradient-to-br ${getGradient(event.start_at)} flex flex-col items-center justify-center text-white py-4`}>
        <span className="text-xs font-bold uppercase tracking-wider opacity-80">{dayName}</span>
        <span className="text-3xl font-extrabold leading-tight">{dayNum}</span>
        <span className="text-xs opacity-80">{monthName}</span>
      </div>

      {/* Event details */}
      <div className="flex-1 px-4 py-3 min-w-0">
        <h3 className="font-semibold text-sm text-gray-900 leading-snug mb-1 line-clamp-2">
          {event.title}
        </h3>
        <p className="text-xs text-gray-500 mb-2">
          ⏰ {startTime}{endTime ? `–${endTime}` : ''}
          {event.location && <span> &nbsp;·&nbsp; 📍 {event.location}</span>}
        </p>
        <div className="flex flex-wrap gap-1.5 items-center">
          {event.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-xs">
              {tag}
            </span>
          ))}
          {event.submitter_name && (
            <span className="text-xs text-gray-400 ml-1">via {event.submitter_name}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col justify-center gap-2 px-3 border-l border-gray-100">
        <SaveToCalendarMenu event={event} />
        {event.rsvp_url && (
          <a
            href={event.rsvp_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-center text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 whitespace-nowrap"
          >
            RSVP ↗
          </a>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add components/SaveToCalendarMenu.tsx components/EventCard.tsx
git commit -m "add event card and save-to-calendar dropdown (google/outlook/apple)"
```

---

## Task 14: Browse Page — List View

**Files:**
- Create: `app/page.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Write layout**

Replace the contents of `app/layout.tsx`:
```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SiT Calendar — Community Events',
  description: 'Community events shared by Sponsors in Tech members.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 text-gray-900 antialiased`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Write browse page**

Replace `app/page.tsx`:
```typescript
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { EventCard } from '@/components/EventCard'
import { CalendarGrid } from '@/components/CalendarGrid'
import type { ApprovedEvent } from '@/types/event'

type ViewMode = 'list' | 'month'

interface BrowsePageProps {
  searchParams: Promise<{ view?: string }>
}

async function getUpcomingEvents(): Promise<ApprovedEvent[]> {
  const supabase = await createClient()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'approved')
    .gte('start_at', now)
    .order('start_at', { ascending: true })

  if (error) return []
  return data as ApprovedEvent[]
}

function groupByWeek(events: ApprovedEvent[]): Map<string, ApprovedEvent[]> {
  const groups = new Map<string, ApprovedEvent[]>()
  events.forEach((event) => {
    const date = new Date(event.start_at)
    // Get the Monday of the event's week
    const day = date.getDay()
    const monday = new Date(date)
    monday.setDate(date.getDate() - ((day + 6) % 7))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    const label = `${monday.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', timeZone: 'Asia/Singapore' })}–${sunday.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', timeZone: 'Asia/Singapore' })}`

    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(event)
  })
  return groups
}

function isThisWeek(label: string, events: ApprovedEvent[]): boolean {
  if (events.length === 0) return false
  const now = new Date()
  const eventDate = new Date(events[0].start_at)
  const diffDays = Math.abs((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays < 7
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const { view } = await searchParams
  const viewMode: ViewMode = view === 'month' ? 'month' : 'list'
  const events = await getUpcomingEvents()
  const grouped = groupByWeek(events)

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Community Events</h1>
            <p className="text-xs text-gray-400">shared by the group · not organised by us</p>
          </div>
          <Link
            href="/submit"
            className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + Share an event
          </Link>
        </div>
        {/* View tabs */}
        <div className="max-w-2xl mx-auto px-4 flex gap-0 border-t border-gray-100">
          <Link
            href="/?view=list"
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              viewMode === 'list'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            ≡ List
          </Link>
          <Link
            href="/?view=month"
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              viewMode === 'month'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📅 Month
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {viewMode === 'list' ? (
          <div>
            {events.length === 0 && (
              <p className="text-center text-gray-400 py-12">No upcoming events yet.</p>
            )}
            {Array.from(grouped.entries()).map(([weekLabel, weekEvents]) => (
              <div key={weekLabel} className="mb-8">
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
                  {isThisWeek(weekLabel, weekEvents) ? `This week · ${weekLabel}` : weekLabel}
                </h2>
                <div className="flex flex-col gap-3">
                  {weekEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <CalendarGrid events={events} />
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```
Expected: Build succeeds. (CalendarGrid will be missing — that's expected, Task 15 adds it.)

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx app/layout.tsx
git commit -m "add browse page with list view, week grouping, and tab navigation"
```

---

## Task 15: CalendarGrid — Month View

**Files:**
- Create: `components/CalendarGrid.tsx`

- [ ] **Step 1: Write CalendarGrid**

Create `components/CalendarGrid.tsx`:
```typescript
'use client'

import { useState } from 'react'
import type { ApprovedEvent } from '@/types/event'
import { SaveToCalendarMenu } from './SaveToCalendarMenu'

interface CalendarGridProps {
  events: ApprovedEvent[]
}

const DAYS_OF_WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function getMonthDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  // Monday-first: getDay() 0=Sun, 1=Mon … remap so Mon=0
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

const CHIP_COLORS = [
  'bg-indigo-500', 'bg-sky-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-violet-500', 'bg-cyan-500',
]

function chipColor(event: ApprovedEvent): string {
  const index = parseInt(event.id.charAt(0), 16) % CHIP_COLORS.length
  return CHIP_COLORS[index]
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
    if (month === 0) { setYear(year - 1); setMonth(11) }
    else setMonth(month - 1)
  }

  function nextMonth() {
    if (month === 11) { setYear(year + 1); setMonth(0) }
    else setMonth(month + 1)
  }

  function eventsOnDay(day: Date): ApprovedEvent[] {
    return events.filter((e) => {
      const eventDate = new Date(e.start_at)
      const sgDate = new Date(eventDate.toLocaleString('en-US', { timeZone: 'Asia/Singapore' }))
      return sameDay(sgDate, day)
    })
  }

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="text-gray-400 hover:text-gray-700 text-xl px-2">‹</button>
        <h2 className="text-base font-bold text-gray-900">{monthLabel}</h2>
        <button onClick={nextMonth} className="text-gray-400 hover:text-gray-700 text-xl px-2">›</button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_OF_WEEK.map((d, i) => (
          <div key={i} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-xl overflow-hidden">
        {days.map((day, i) => {
          if (!day) return <div key={i} className="bg-white min-h-[72px]" />
          const dayEvents = eventsOnDay(day)
          const isToday = sameDay(day, today)
          return (
            <div
              key={i}
              className={`bg-white min-h-[72px] p-1.5 ${dayEvents.length ? 'cursor-pointer hover:bg-indigo-50' : ''}`}
            >
              <div className={`text-xs font-semibold mb-1 w-5 h-5 flex items-center justify-center rounded-full ${
                isToday ? 'bg-indigo-600 text-white' : 'text-gray-700'
              }`}>
                {day.getDate()}
              </div>
              <div className="flex flex-col gap-0.5">
                {dayEvents.slice(0, 2).map((event) => (
                  <button
                    key={event.id}
                    onClick={() => setSelected(selected?.id === event.id ? null : event)}
                    className={`${chipColor(event)} text-white text-[10px] px-1.5 py-0.5 rounded truncate text-left w-full`}
                  >
                    {event.title}
                  </button>
                ))}
                {dayEvents.length > 2 && (
                  <span className="text-[10px] text-gray-400">+{dayEvents.length - 2} more</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Event detail popover */}
      {selected && (
        <div className="mt-4 border border-gray-200 rounded-2xl p-4 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-gray-900 mb-1">{selected.title}</h3>
              <p className="text-xs text-gray-500 mb-2">
                ⏰{' '}
                {new Date(selected.start_at).toLocaleDateString('en-SG', {
                  weekday: 'short', day: 'numeric', month: 'short',
                  hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Singapore',
                })}
                {selected.location && <span> &nbsp;·&nbsp; 📍 {selected.location}</span>}
              </p>
              {selected.description && (
                <p className="text-xs text-gray-600 mb-3 line-clamp-3">{selected.description}</p>
              )}
              <div className="flex gap-2 flex-wrap">
                <SaveToCalendarMenu event={selected} />
                {selected.rsvp_url && (
                  <a
                    href={selected.rsvp_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
                  >
                    RSVP ↗
                  </a>
                )}
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-lg shrink-0">×</button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add components/CalendarGrid.tsx
git commit -m "add month view calendar grid with day chips and event popover"
```

---

## Task 16: ModCard Component

**Files:**
- Create: `components/ModCard.tsx`

- [ ] **Step 1: Write ModCard**

Create `components/ModCard.tsx`:
```typescript
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

  const headerClass = duplicateTitle
    ? 'bg-red-50 border-b border-red-200'
    : 'bg-amber-50 border-b border-amber-100'

  const submitterLine = [
    timeSince(event.submitted_at),
    event.submitter_name && `via ${event.submitter_name}`,
    event.submitter_email && `(${event.submitter_email})`,
  ].filter(Boolean).join(' · ')

  return (
    <div className={`border rounded-2xl overflow-hidden bg-white ${duplicateTitle ? 'border-red-300' : 'border-amber-200'}`}>
      {/* Card header */}
      <div className={`${headerClass} px-4 py-2.5 flex items-center justify-between`}>
        <span className={`text-xs font-semibold ${duplicateTitle ? 'text-red-800' : 'text-amber-800'}`}>
          {duplicateTitle ? '⚠ Possible duplicate · ' : '⏳ '}{submitterLine}
        </span>
        {event.rsvp_url && (
          <a
            href={event.rsvp_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-600 hover:underline"
          >
            View source ↗
          </a>
        )}
      </div>

      {editing ? (
        <div className="p-4">
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
          <button onClick={() => setEditing(false)} className="mt-2 text-sm text-gray-400 hover:text-gray-600">
            Cancel
          </button>
        </div>
      ) : (
        <>
          <div className="px-4 py-3">
            <h3 className="font-bold text-sm text-gray-900 mb-1">{event.title}</h3>
            <p className="text-xs text-gray-500 mb-2">
              ⏰ {new Date(event.start_at).toLocaleDateString('en-SG', {
                weekday: 'short', day: 'numeric', month: 'short',
                hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Singapore',
              })}
              {event.location && <span> &nbsp;·&nbsp; 📍 {event.location}</span>}
            </p>
            {event.description && (
              <p className="text-xs text-gray-500 line-clamp-2 mb-2">{event.description}</p>
            )}
            {event.tags.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {event.tags.map((tag) => (
                  <span key={tag} className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-xs">{tag}</span>
                ))}
              </div>
            )}
            {duplicateTitle && (
              <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <p className="text-xs text-red-800">
                  Similar event already submitted: <strong>{duplicateTitle}</strong>
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-4 py-3 border-t border-gray-100 flex gap-2 items-center">
            <button
              onClick={() => onApprove(event.id)}
              className="bg-emerald-600 text-white rounded-lg px-4 py-1.5 text-sm font-semibold hover:bg-emerald-700"
            >
              ✓ Approve
            </button>
            <button
              onClick={() => onReject(event.id)}
              className="bg-red-500 text-white rounded-lg px-4 py-1.5 text-sm font-semibold hover:bg-red-600"
            >
              ✕ Reject
            </button>
            <button
              onClick={() => setEditing(true)}
              className="border border-indigo-200 text-indigo-600 rounded-lg px-4 py-1.5 text-sm hover:bg-indigo-50"
            >
              ✎ Edit first
            </button>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/ModCard.tsx
git commit -m "add moderation card with approve/reject/edit actions"
```

---

## Task 17: Admin Moderation Queue

**Files:**
- Create: `app/admin/page.tsx`
- Create: `app/api/admin/events/[id]/route.ts`

- [ ] **Step 1: Write admin events API route**

Create `app/api/admin/events/[id]/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Action = 'approve' | 'reject'

interface UpdateBody {
  action: Action
  updates?: Partial<{
    title: string
    start_at: string
    end_at: string | null
    location: string
    description: string
    rsvp_url: string
    image_url: string | null
    tags: string[]
  }>
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await request.json() as UpdateBody

  const update: Record<string, unknown> = {
    ...(body.updates ?? {}),
    status: body.action === 'approve' ? 'approved' : 'rejected',
  }

  if (body.action === 'approve') {
    update.approved_at = new Date().toISOString()
    update.approved_by = user.email
  }

  const { error } = await supabase
    .from('events')
    .update(update)
    .eq('id', id)
    .eq('status', 'pending') // Safety: only update pending events

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Write admin queue page**

Create `app/admin/page.tsx`:
```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ModCard } from '@/components/ModCard'
import type { PendingEvent, Event } from '@/types/event'

export default function AdminPage() {
  const [events, setEvents] = useState<PendingEvent[]>([])
  const [approvedUrls, setApprovedUrls] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)

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
    const response = await fetch(`/api/admin/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, updates }),
    })
    if (response.ok) {
      setEvents((prev) => prev.filter((e) => e.id !== id))
    } else {
      alert('Action failed. Please try again.')
    }
  }

  function handleEdit(id: string, data: Partial<PendingEvent>) {
    updateEvent(id, 'approve', data)
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading queue…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Moderation queue</h1>
            <p className="text-sm text-gray-400">{events.length} pending</p>
          </div>
          <a href="/" className="text-sm text-gray-400 hover:text-gray-600">← Calendar</a>
        </div>

        {events.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-2">✅</p>
            <p className="text-gray-500">Queue is clear</p>
          </div>
        )}

        <div className="flex flex-col gap-4">
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
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Run all tests**

```bash
npm test
```
Expected: All tests pass. No failures.

- [ ] **Step 4: Full build check**

```bash
npm run build
```
Expected: Build succeeds. No TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add app/admin/page.tsx app/api/admin/events/
git commit -m "add moderation queue page with approve/reject/edit and duplicate flagging"
```

---

## Post-Build Checklist

Before going live:

- [ ] Run schema SQL in Supabase dashboard
- [ ] Create `event-images` bucket in Supabase Storage (public read)
- [ ] Add moderator email rows to `moderators` table
- [ ] Configure Supabase Auth → Email → Enable "Magic Link"
- [ ] Set redirect URL in Supabase Auth settings: `https://your-vercel-domain.vercel.app/admin`
- [ ] Add all env vars to Vercel project settings
- [ ] Deploy: `git push` to trigger Vercel deployment
- [ ] Test full submit flow end-to-end
- [ ] Test moderator login and approve/reject
