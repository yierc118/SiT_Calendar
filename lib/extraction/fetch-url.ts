const MIN_CONTENT_LENGTH = 200
const MAX_CONTENT_LENGTH = 12000
const FETCH_TIMEOUT_MS = 10000

/** Extract JSON-LD structured data blocks from HTML */
function extractJsonLd(html: string): string {
  // [^>]* (zero-or-more) so we match both <script type="..."> and <script id="x" type="...">
  const matches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  if (matches.length === 0) return ''
  const valid = matches
    .map((m) => m[1].trim())
    .filter((raw) => {
      try { JSON.parse(raw); return true } catch { return false }
    })
  return valid.join('\n')
}

/** Extract Open Graph + Twitter meta tags as key:value text */
function extractMetaTags(html: string): string {
  const metaMatches = [
    ...html.matchAll(/<meta[^>]+(?:property|name)=["']([^"']+)["'][^>]+content=["']([^"']+)["'][^>]*>/gi),
    ...html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']([^"']+)["'][^>]*>/gi),
  ]
  const relevant = ['og:title', 'og:description', 'og:url', 'twitter:title', 'twitter:description',
    'description', 'og:site_name', 'og:image', 'article:published_time', 'event:start_time',
    'event:end_time', 'event:location']
  const lines: string[] = []
  for (const m of metaMatches) {
    const key = (m[1] || m[2]).toLowerCase()
    const val = m[2] || m[1]
    if (relevant.some((r) => key.includes(r.replace('og:', '').replace('twitter:', '').replace('event:', '')))) {
      lines.push(`${key}: ${val}`)
    }
  }
  return lines.join('\n')
}

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
 * Prioritises JSON-LD structured data and Open Graph meta tags (survive SPA fetches).
 * Falls back to full page text stripping.
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

    // Tier 1a: JSON-LD structured data (best for Luma, Eventbrite, Meetup)
    const jsonLd = extractJsonLd(html)
    if (jsonLd.length >= MIN_CONTENT_LENGTH) {
      return jsonLd.slice(0, MAX_CONTENT_LENGTH)
    }

    // Tier 1b: Open Graph / meta tags (usually always present)
    const meta = extractMetaTags(html)

    // Tier 1c: Plain text from visible HTML
    const bodyText = htmlToText(html)

    // Combine meta + body text for Gemini
    const combined = [meta, bodyText].filter(Boolean).join('\n\n')
    if (combined.length < MIN_CONTENT_LENGTH) return null

    return combined.slice(0, MAX_CONTENT_LENGTH)
  } catch {
    return null
  }
}
