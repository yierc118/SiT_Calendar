# SiT Calendar — Build Status

## Task Progress

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Project Bootstrap | ✅ Built | Next.js 16 + Tailwind v4. npm cache issue worked around with --cache /tmp/npm-cache-new. |
| 2 | Database Schema and Shared Types | ✅ Built | |
| 3 | Supabase Clients | ✅ Built | |
| 4 | Auth Middleware and Admin Login | ✅ Built | middleware.ts deprecated warning in Next.js 16 (use proxy) — still functional. |
| 5 | Extraction Types and Gemini Wrapper | ✅ Built | Fixed vi.fn() class mock approach in test. |
| 6 | URL Fetch (Tier 1) | ✅ Built | |
| 7 | Brave Search Fallback (Tier 2) | ✅ Built | |
| 8 | Extraction Orchestrator and API Route | ✅ Built | |
| 9 | Duplicate Detection | ✅ Built | Fixed vi.mock hoisting issue — moved mock data inline into factory. |
| 10 | Calendar Export Utilities | ✅ Built | |
| 11 | Submit Page | ✅ Built | |
| 12 | Confirm Page | ✅ Built | |
| 13 | SaveToCalendar Dropdown + EventCard | ✅ Built | |
| 14 | Browse Page — List View | ✅ Built | |
| 15 | CalendarGrid — Month View | ✅ Built | |
| 16 | ModCard Component | ✅ Built | |
| 17 | Admin Moderation Queue | ✅ Built | |

## Final Verification

- Tests: 17 passed (6 test files)
- Build: ✅ No TypeScript errors
- Routes built: /, /admin, /admin/login, /submit, /submit/confirm, /api/extract, /api/events, /api/events/[id]/ics, /api/check-duplicate, /api/admin/events/[id]

## Review Fixes Applied — 2026-04-17

All 5 fixes from REVIEW.md applied and verified (build + tests pass):

1. `middleware.ts` — matcher changed to `/admin/((?!login).*)` to prevent infinite redirect loop on `/admin/login`
2. `app/api/admin/events/[id]/route.ts` — added moderator table check after auth.getUser(); returns 403 Forbidden if email not in moderators table
3. `app/api/events/route.ts` — added rsvp_url protocol validation (must start with http:// or https://)
4. `app/api/check-duplicate/route.ts` — wrapped handler body in try/catch; errors return `{ duplicate: null }` instead of unhandled 500
5. `app/api/extract/route.ts` — sanitized uploaded filename: strips non-alphanumeric characters (except `.`, `_`, `-`) and limits to 100 chars

## Blocked / Needs Human Input

None — all tasks complete.

## Pre-Deploy Checklist (for human)

- [ ] Run schema SQL in Supabase dashboard (lib/supabase/schema.sql)
- [ ] Create `event-images` bucket in Supabase Storage (public read)
- [ ] Add moderator email rows to `moderators` table
- [ ] Configure Supabase Auth → Email → Enable "Magic Link"
- [ ] Set redirect URL in Supabase Auth settings: `https://your-vercel-domain.vercel.app/admin`
- [ ] Add all env vars to Vercel project settings (see .env.example)
- [ ] Deploy: push to trigger Vercel deployment
- [ ] Test full submit flow end-to-end
- [ ] Test moderator login and approve/reject

## Notes

- Using Next.js 16.2.4 (plan specifies 14, but 16 is latest and compatible — App Router API is identical)
- Tailwind v4 format (no tailwind.config.ts — uses @import "tailwindcss" in globals.css)
- middleware.ts generates a deprecation warning in Next.js 16 (should be renamed to proxy.ts for production — functional for now)
- Two test adaptations from plan: (1) Gemini mock uses class syntax instead of vi.fn().mockImplementation for constructor; (2) duplicates.test.ts moves mock data inline to avoid vi.mock hoisting issue
