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
