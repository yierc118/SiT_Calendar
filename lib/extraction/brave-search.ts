const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search'

/**
 * Builds a targeted search query from a URL.
 * For LinkedIn, extracts the username/company slug and searches by name.
 * For other URLs, searches the URL directly.
 */
function buildSearchQuery(url: string): string {
  try {
    const parsed = new URL(url)
    // LinkedIn post: linkedin.com/posts/username_activity-xxx or /feed/update/urn:li:activity:xxx
    if (parsed.hostname.includes('linkedin.com')) {
      const postMatch = parsed.pathname.match(/\/posts\/([^_/]+)/)
      if (postMatch) return `site:linkedin.com ${postMatch[1].replace(/-/g, ' ')} event`
      return `linkedin.com ${parsed.pathname.split('/').filter(Boolean).slice(0, 2).join(' ')} event`
    }
  } catch {
    // fall through
  }
  return url
}

/**
 * Searches Brave for the given query (typically a URL) and returns
 * concatenated title + description snippets for Gemini to extract from.
 * Returns null if the search fails or returns no results.
 */
export async function searchBrave(query: string): Promise<string | null> {
  try {
    const searchQuery = buildSearchQuery(query)
    const params = new URLSearchParams({ q: searchQuery, count: '5' })
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
