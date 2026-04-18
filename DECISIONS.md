# SiT Calendar — Implementation Decisions

## D1: Next.js 16 instead of 14

**Context:** The plan specifies Next.js 14, but `create-next-app@latest` scaffolds Next.js 16.2.4.

**Decision:** Use Next.js 16.2.4. The App Router API (layout, page, route handlers, params as Promises) is identical between 14 and 16. No spec behaviour is affected.

**Impact:** `middleware.ts` generates a deprecation warning — Next.js 16 prefers `proxy.ts`. The middleware is still fully functional. Rename to `proxy.ts` when upgrading in future.

## D2: Tailwind v4 format

**Context:** The plan references a `tailwind.config.ts` file. Next.js 16 scaffolds with Tailwind v4 which uses `@import "tailwindcss"` in `globals.css` instead of a config file.

**Decision:** Use Tailwind v4 format. No config file needed. All utility classes used in the plan work identically.

## D3: Gemini test mock uses class syntax

**Context:** The plan's test uses `vi.fn().mockImplementation(() => ({...}))` for `GoogleGenerativeAI`. In Vitest, `new MockedClass()` requires the mock to be an actual class (constructor function).

**Decision:** Replace with `class { getGenerativeModel() {...} }` syntax in the mock. Test semantics are identical — still verifies parsing and error handling.

## D4: Duplicate detection test mock data moved inline

**Context:** The plan places `mockEvent` as a module-level `const` before `vi.mock(...)`. Vitest hoists `vi.mock` calls to the top of the file, causing `ReferenceError: Cannot access 'mockEvent' before initialization`.

**Decision:** Move mock event data inline inside the `vi.mock` factory function. Test assertions are identical.

## D5: npm cache workaround

**Context:** The npm cache at `~/.npm/_cacache` had a permission-corrupted entry that prevented all `npm install` commands.

**Decision:** All `npm install` calls use `--cache /tmp/npm-cache-new` to bypass the corrupted cache. This does not affect the installed packages — identical versions are installed.
