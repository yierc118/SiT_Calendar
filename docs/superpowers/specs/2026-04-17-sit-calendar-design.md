# SiT Calendar — Design Spec

**Date:** 2026-04-17  
**Project:** Sponsors in Tech — Community Event Calendar  
**Stack:** Next.js (App Router) · Supabase · Gemini API · Brave Search API · Tailwind · Vercel

---

## Overview

A lightweight web app where community members submit events by pasting a URL or uploading a poster image. An LLM extracts structured event details, the submitter confirms, and the event is published to a shared calendar after moderator approval. Anyone can browse upcoming events and save them to their personal calendar.

**Core design principle:** minimise effort per event, forever. No multi-field forms. No volunteer transcription. One paste box, one confirmation, done.

---

## Users

- **Submitters** — community members sharing events they've seen (Luma, Eventbrite, Meetup, LinkedIn, org websites, WhatsApp poster images). No account required. Name and email are optional.
- **Browsers** — community members looking for events to attend. No account required.
- **Moderators** — 2–3 volunteers who review a lightweight approval queue. Auth via Supabase magic link (email only, no passwords).

---

## Architecture

Single Next.js app (App Router) deployed on Vercel.

| Layer | Technology |
|---|---|
| Frontend + API routes | Next.js 14 (App Router) |
| Database | Supabase (Postgres) |
| File storage | Supabase Storage (uploaded poster images) |
| Auth | Supabase magic link (moderators only) |
| LLM extraction | Google Gemini API (text + vision) |
| Search fallback | Brave Search API |
| Styling | Tailwind CSS |
| Deployment | Vercel |

### Route structure

| Route | Description |
|---|---|
| `/` | Public browse page (list + month views) |
| `/submit` | Event submission page |
| `/submit/confirm` | Confirmation / edit page after extraction |
| `/admin` | Moderator queue (protected) |
| `/admin/login` | Magic link login |
| `/api/extract` | LLM extraction endpoint |

---

## Core Flows

### 1. Submit Flow

1. Submitter lands on `/submit`
2. Single unified input area: paste a URL **or** drag/drop an image poster (both handled in one zone)
3. Hits "Extract event details →"
4. **Duplicate check**: if the URL matches an existing approved or pending event's `rsvp_url`, show the existing event and block submission
5. App runs extraction pipeline (see below) — loading state shown
6. Extracted data is held in `sessionStorage` and passed to `/submit/confirm`. If the submitter refreshes the confirm page, they return to `/submit` (acceptable — re-extraction takes a few seconds).
7. Submitter lands on `/submit/confirm` with all extracted fields pre-populated and editable:
   - Cover image (extracted or uploaded)
   - Title
   - Start datetime (highlighted with "double-check" warning — most error-prone)
   - End datetime
   - Location
   - Description
   - Tags (editable chips, add/remove)
   - RSVP / source URL
   - Optional: submitter name, submitter email
7. Submitter hits "Submit for review →"
8. Event saved to database with `status = pending`
9. Success message: "Thanks! Your event is under review."

### 2. Browse Flow

Public page at `/`. No auth required.

- **List view** (default): upcoming approved events grouped by week. Each card shows date block, title, time, location, tags, submitter attribution ("via Priya R."), RSVP button, and "🗓 Save ▾" dropdown.
- **Month view**: calendar grid with coloured event chips per day. Clicking a chip shows event detail inline or in a popover.
- **"🗓 Save ▾" dropdown**: three options — Google Calendar (URL template), Outlook (URL template), Apple Calendar (`.ics` download generated server-side per event).
- **"+ Share an event"** button always visible in the top bar.
- Past events are not shown (filter by `start_at >= today`).

### 3. Moderate Flow

Protected at `/admin`. Moderators log in via magic link email.

- Queue shows all `pending` events ordered by `submitted_at` ascending (oldest first)
- Each card shows: submission metadata (time, submitter), event details, source URL link, duplicate flag (if applicable)
- Per-event actions:
  - **Approve** — sets `status = approved`, records `approved_at` and `approved_by`
  - **Reject** — sets `status = rejected`
  - **Edit first** — opens same confirmation form pre-populated; edit form has two actions: "Save & Approve" (approves immediately) and "Save as Pending" (returns to queue for a second look)
- Duplicate flag: if a pending event's `rsvp_url` matches an already-approved event, show a red warning with a link to the existing event. Moderator can still approve or reject.
- Target: ~10 seconds per event for a clean submission.

---

## Extraction Pipeline

API route: `POST /api/extract`  
Accepts: `{ url: string }` or `{ image: File }`

### URL extraction (3-tier)

**Tier 1 — Direct fetch:**
Fetch the URL, extract HTML text content, send to Gemini with a structured extraction prompt. Returns `{ title, start_at, end_at, location, description, rsvp_url, image_url, tags }`.

**Tier 2 — Brave Search fallback:**
If the fetch fails (blocked, requires login, JS-rendered) or returns insufficient content (< 200 chars of meaningful text), query the Brave Search API using the URL as the search query. Extract from the top search result snippets via Gemini.

**Tier 3 — Manual fallback:**
If both tiers fail, return whatever partial data was extracted (may be just the URL slug) and flag `extraction_partial: true`. The confirmation form pre-populates with partial data; submitter fills in the rest.

### Image extraction
Upload the image to Supabase Storage. Send the image URL to Gemini Vision with the same extraction prompt. No fetch step needed.

### Extraction prompt output schema
```json
{
  "title": "string",
  "start_at": "ISO 8601 datetime string",
  "end_at": "ISO 8601 datetime string | null",
  "location": "string",
  "description": "string",
  "rsvp_url": "string",
  "image_url": "string | null",
  "tags": ["string"],
  "extraction_partial": false
}
```

All datetimes stored and returned in UTC. Display timezone: Asia/Singapore (SGT, UTC+8).

---

## Data Model

### `events` table

| column | type | notes |
|---|---|---|
| `id` | uuid | primary key, default gen_random_uuid() |
| `title` | text | not null |
| `start_at` | timestamptz | not null, stored UTC |
| `end_at` | timestamptz | nullable |
| `location` | text | |
| `description` | text | |
| `rsvp_url` | text | original source URL, used for duplicate detection |
| `image_url` | text | Supabase Storage public URL |
| `tags` | text[] | array of keyword strings extracted by LLM |
| `status` | text | enum: `pending` / `approved` / `rejected` |
| `submitter_name` | text | nullable |
| `submitter_email` | text | nullable |
| `submitted_at` | timestamptz | default now() |
| `approved_at` | timestamptz | nullable |
| `approved_by` | text | moderator email, nullable |

### `moderators` table

| column | type | notes |
|---|---|---|
| `id` | uuid | primary key |
| `email` | text | unique, used to match Supabase auth user |

Moderator access is checked by verifying the logged-in user's email exists in the `moderators` table.

---

## Duplicate Detection

Applies to URL submissions only. Image uploads have no URL to match on — duplicate detection is skipped; moderators catch duplicates visually.

On URL submission (before extraction), and again on final submit:
1. Query `events` where `rsvp_url = submitted_url` AND `status IN ('pending', 'approved')`
2. If match found → return existing event data to the frontend
3. Frontend shows: "This event has already been submitted. [View it →]"
4. Submission is blocked for the submitter
5. Moderators see a softer duplicate flag (can still approve if it's a legitimately different submission)

---

## Calendar Export

**Google Calendar:** Construct URL:
```
https://calendar.google.com/calendar/render?action=TEMPLATE
  &text={title}
  &dates={start_YYYYMMDDTHHmmssZ}/{end_YYYYMMDDTHHmmssZ}
  &details={description}
  &location={location}
```

**Outlook:** Construct URL:
```
https://outlook.live.com/calendar/0/deeplink/compose?subject={title}
  &startdt={ISO8601}&enddt={ISO8601}&body={description}&location={location}
```

**Apple Calendar:** Server-side `.ics` file generation per event, returned as `text/calendar` download.

---

## Out of Scope (MVP)

- `.ics` subscription feed (subscribe once, auto-updates) — post-MVP
- Event search / filtering by tag on the browse page — post-MVP
- Submitter accounts or submission history — not planned
- Email notifications to submitters on approval — post-MVP
- Rich text descriptions — plain text only for now
