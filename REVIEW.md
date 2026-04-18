## Code Review — 2026-04-17

**Verdict: Approved with Fixes**
**Pipeline: Continue**

### Critical (blocks pipeline if security/data risk)

- **`.env:4-5` — Real API keys committed to the repository.** The `.env` file contains what appear to be actual Gemini (`AIzaSyBpIzk...`) and Brave Search (`BSABkR1s...`) API keys. While `.env` is in `.gitignore`, the file currently exists with real credentials. If this repo is ever pushed to a public remote, these keys are leaked. **Action:** Rotate both keys immediately. Ensure `.env` never contains real values — only `.env.local` should. This does NOT block the pipeline because `.gitignore` correctly excludes `.env`, but the keys should be rotated as a precaution.

### Warnings (auto-approved, /implement will fix next pass)

1. ~~**`middleware.ts:53-55` — Middleware matcher catches `/admin/login`, causing infinite redirect loop.**~~ **FIXED 2026-04-17** — Matcher changed to `['/admin/((?!login).*)']`.

2. ~~**`app/api/admin/events/[id]/route.ts:27-28` — Auth check verifies user exists but does not verify moderator role.**~~ **FIXED 2026-04-17** — Moderator table check added to PATCH handler.

3. ~~**`app/api/extract/route.ts:31-32` — Image upload filename uses unsanitized `file.name`.**~~ **FIXED 2026-04-17** — Filename sanitised with `/[^a-zA-Z0-9._-]/g` replace.

4. ~~**`app/api/events/route.ts` — `rsvp_url` could be a `javascript:` URL.**~~ **FIXED 2026-04-17** — `/^https?:\/\//` protocol validation added.

5. ~~**`app/api/check-duplicate/route.ts` — Missing error handling.**~~ **FIXED 2026-04-17** — try/catch added.

6. **`lib/calendar/google.ts:4` and `lib/calendar/ics.ts:3` — `toGoogleDatetime`/`toIcsDatetime` regex assumes `.000Z` suffix.** Still pending — low risk, the fallback regex catches it.

7. **`lib/calendar/google.ts` and `lib/calendar/outlook.ts` — `addOneHour` duplicated across three files.** Still pending — low priority.

8. ~~**`app/page.tsx:46-52` — `isThisWeek` function unreliable.**~~ **FIXED 2026-04-17** — Replaced with proper Monday-Sunday boundary check.

9. ~~**`components/CalendarGrid.tsx:65` — Timezone conversion via `toLocaleString` round-trip is fragile.**~~ **FIXED 2026-04-17** — Replaced with `toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' })` YYYY-MM-DD string comparison.

10. **`app/api/events/route.ts` — No rate limiting on event submission.** Still pending — defer to production hardening.

### Nits (optional, low priority)

1. **`middleware.ts` — Next.js 16 deprecation warning.** `middleware.ts` should be `proxy.ts` in Next.js 16. Low priority.

2. **`components/ConfirmForm.tsx:49` — `eslint-disable` for `no-img-element`.** Consider using Next.js `<Image>` for external URLs from Supabase Storage.

3. **`app/admin/page.tsx:16-25` — Two sequential Supabase queries could be parallelized.** Use `Promise.all` for minor perf improvement.

4. **`lib/extraction/types.ts:12-28` — Redundant markdown-stripping.** Good defensive coding, noted.

5. **`types/event.ts:24-35` — `ExtractedEvent.location` / `.description` nullability mismatch with `Event`.** Handled with `?? ''` in ConfirmForm.

### What's Good

- **Extraction pipeline is well-designed.** The 3-tier fallback (fetch → Brave → manual) never throws, always returns something for the confirm form.
- **Duplicate detection correctly server-only.** `lib/duplicates.ts` imports `createServiceClient` (server-only), and the client calls `/api/check-duplicate`. Spec requirement met.
- **RLS policies are comprehensive.** Public can only read approved events, anyone can insert pending events, moderators get full access.
- **No `any` types anywhere in application code.** TypeScript strict mode is well-maintained.
- **Service role key is only used server-side.** Never exposed to client bundles.
- **ICS generation is correct.** Proper CRLF line endings, escaping, VCALENDAR/VEVENT structure.
- **Calendar export URLs use correct formats.** Google Calendar uses `YYYYMMDDTHHMMSSZ`, Outlook uses ISO 8601 directly.
- **Clean component architecture.** Components are small, single-purpose, well-typed.

---

## Design QA — 2026-04-17 (updated 2026-04-18)

**Verdict: Approved** ✓

Full visual redesign completed 2026-04-18. All critical and most polish/accessibility items resolved.

### Fixed (2026-04-18 redesign pass)

- ~~**ConfirmForm date inputs are raw ISO 8601 strings.**~~ **FIXED** — `<input type="datetime-local">` with `toDatetimeLocal()`/`fromDatetimeLocal()` SGT conversion.
- ~~**Confirm page renders blank white screen before redirect.**~~ **FIXED** — Loading spinner shown while draft loads from `sessionStorage`.
- ~~**Error handling uses `alert()`.**~~ **FIXED** — Both confirm page and admin page use inline styled error banners.
- ~~**No loading feedback in drop zone during image extraction.**~~ **FIXED** — Full spinner overlay on `SubmitInput` when `loading=true`.
- ~~**Font stack conflict.**~~ **FIXED** — Playfair Display + DM Sans via `next/font/google`; CSS custom properties `--font-playfair` / `--font-dmsans` used throughout; no Tailwind font class conflict.
- ~~**Duplicate "T"/"S" day headers in CalendarGrid.**~~ **FIXED** — `['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']`.
- ~~**No back navigation from submit page.**~~ **FIXED** — "← SiT Calendar" link in sticky header on all submit/admin pages.
- ~~**No shared branding.**~~ **FIXED** — Consistent sticky header with Playfair wordmark + ThemeToggle across all pages.
- ~~**Month navigation buttons missing ARIA labels.**~~ **FIXED** — `aria-label="Previous month"` / `aria-label="Next month"`.
- ~~**Close popover button missing ARIA label.**~~ **FIXED** — `aria-label="Close event details"`.
- ~~**SaveToCalendarMenu missing ARIA.**~~ **FIXED** — `aria-haspopup="true"` and `aria-expanded={open}`.
- ~~**Tag remove button missing accessible label.**~~ **FIXED** — `aria-label={Remove tag ${tag}}`.
- ~~**Upload area is a `<div>` not a button.**~~ **FIXED** — Changed to `<button type="button">` with `onKeyDown` handler.
- ~~**Dark mode CSS variables unused.**~~ **FIXED** — Full dark mode token system; `.dark` class toggled via ThemeProvider/ThemeToggle; consistent across all pages.
- ~~**Emoji-only labels for time/location.**~~ **FIXED** — `<span className="sr-only">` added before emoji icons in EventCard.
- ~~**ConfirmForm inputs missing `id`/`htmlFor`.**~~ **FIXED** — All label/input pairs have matching `htmlFor`/`id`.
- ~~**SaveToCalendarMenu emoji icons.**~~ **FIXED** — Letter icons (G/O/⌘) with clear labels.
- ~~**Calendar chip buttons blow out grid columns.**~~ **FIXED 2026-04-18** — `minWidth: 0` + `overflow: hidden` on day cells; `display: block` + `box-sizing: border-box` on chip buttons.
- ~~**Save dropdown cut off.**~~ **FIXED 2026-04-18** — Changed `right: 0` → `left: 0` on dropdown.

### Remaining Polish (low priority)

- **`components/ModCard.tsx` — Approve/Reject have no confirmation or undo.** A mis-click on Reject is permanent. Consider a 1-second undo toast or confirmation on the Reject button specifically.
- **`lib/calendar/google.ts` / `lib/calendar/outlook.ts` — `addOneHour` duplicated across three files.** Extract to `lib/calendar/utils.ts`.
- **`lib/calendar/google.ts:4` — Dead `.replace('.000Z', 'Z')` before the regex version.** Remove the literal replace; keep only the regex.
- **`app/admin/page.tsx` — Two Supabase queries are sequential; use `Promise.all`.**
