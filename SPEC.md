# SiT Calendar — Spec

**Project:** Sponsors in Tech — Community Event Calendar  
**Stack:** Next.js 14 (App Router) · TypeScript strict · Supabase · Gemini API · Brave Search API · Tailwind CSS · Vercel  
**Design doc:** `docs/superpowers/specs/2026-04-17-sit-calendar-design.md`  
**Implementation plan:** `docs/superpowers/plans/2026-04-17-sit-calendar.md`

---

## What We're Building

A lightweight web app where community members submit events by pasting a URL or uploading a poster image. An LLM extracts structured event details, the submitter confirms, and the event is published to a shared calendar after moderator approval.

**Core design principle:** minimise effort per event, forever. No multi-field forms. No volunteer transcription. One paste box, one confirmation, done.

---

## Users

- **Submitters** — no account required, name/email optional
- **Browsers** — public, no auth
- **Moderators** — magic link auth, email must exist in `moderators` table

---

## Routes

| Route | Description |
|---|---|
| `/` | Public browse page (list + month views) |
| `/submit` | Event submission — URL paste or image drop |
| `/submit/confirm` | Editable confirmation form after extraction |
| `/admin` | Moderator queue (protected by middleware) |
| `/admin/login` | Magic link login |
| `/api/extract` | POST — LLM extraction (URL or image) |
| `/api/events` | POST — save pending event |
| `/api/events/[id]/ics` | GET — Apple Calendar .ics download |
| `/api/check-duplicate` | GET — check rsvp_url for duplicates |
| `/api/admin/events/[id]` | PATCH — approve or reject |

---

## File Structure

```
├── app/
│   ├── layout.tsx
│   ├── page.tsx                        # Browse (list + month)
│   ├── submit/page.tsx                 # Submit input
│   ├── submit/confirm/page.tsx         # Confirm form
│   ├── admin/page.tsx                  # Mod queue
│   ├── admin/login/page.tsx            # Magic link login
│   └── api/
│       ├── extract/route.ts
│       ├── events/route.ts
│       ├── events/[id]/ics/route.ts
│       ├── check-duplicate/route.ts
│       └── admin/events/[id]/route.ts
├── components/
│   ├── EventCard.tsx
│   ├── CalendarGrid.tsx
│   ├── SaveToCalendarMenu.tsx
│   ├── SubmitInput.tsx
│   ├── ConfirmForm.tsx
│   └── ModCard.tsx
├── lib/
│   ├── supabase/client.ts
│   ├── supabase/server.ts
│   ├── supabase/schema.sql
│   ├── extraction/types.ts
│   ├── extraction/gemini.ts
│   ├── extraction/fetch-url.ts
│   ├── extraction/brave-search.ts
│   ├── extraction/extract.ts
│   ├── calendar/google.ts
│   ├── calendar/outlook.ts
│   ├── calendar/ics.ts
│   └── duplicates.ts
├── types/event.ts
├── middleware.ts
├── vitest.config.ts
└── vitest.setup.ts
```

---

## Key Behaviours

### Extraction pipeline (3-tier)
1. Direct URL fetch → Gemini text extraction
2. Brave Search fallback (if fetch fails/insufficient)
3. Manual fallback — return partial data, flag `extraction_partial: true`
- Image uploads → Gemini vision (base64), skip fetch tiers
- Never throws — always returns something for the confirm form

### Duplicate detection
- URL submissions only (image uploads skip this)
- Check `rsvp_url` against `status IN ('pending', 'approved')`
- Submitter sees warning + link to existing event
- `lib/duplicates.ts` is **server-only** — client components call `/api/check-duplicate`

### Moderation
- Approve → `status = approved`, records `approved_at` + `approved_by`
- Reject → `status = rejected`
- Edit first → ConfirmForm pre-populated; "Save & Approve" or "Save as Pending"
- Duplicate flag shown in red on mod card if `rsvp_url` matches an approved event

### Calendar export
- Google Calendar: URL template
- Outlook: URL template  
- Apple Calendar: `.ics` download via `/api/events/[id]/ics`
- All three in "🗓 Save ▾" dropdown on EventCard

### Browse page
- List view (default): events grouped by week, `start_at >= now()`
- Month view: calendar grid with coloured chips per day, click to expand

---

## Data Model

### `events`
```sql
id UUID PK, title TEXT NOT NULL, start_at TIMESTAMPTZ NOT NULL,
end_at TIMESTAMPTZ, location TEXT, description TEXT, rsvp_url TEXT,
image_url TEXT, tags TEXT[] DEFAULT '{}',
status TEXT CHECK ('pending'|'approved'|'rejected') DEFAULT 'pending',
submitter_name TEXT, submitter_email TEXT,
submitted_at TIMESTAMPTZ DEFAULT NOW(),
approved_at TIMESTAMPTZ, approved_by TEXT
```

### `moderators`
```sql
id UUID PK, email TEXT UNIQUE NOT NULL
```

Schema file: `lib/supabase/schema.sql`

---

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
BRAVE_SEARCH_API_KEY
```

---

## Testing
- Framework: Vitest + React Testing Library
- Test files co-located: `lib/extraction/gemini.test.ts` etc.
- Run: `npm test`
- Pure functions (extraction, calendar utils, duplicates) have unit tests
- UI components: smoke/render tests only

---

## Out of Scope (MVP)
- `.ics` subscription feed
- Tag filtering on browse page
- Submitter accounts
- Email notifications on approval
