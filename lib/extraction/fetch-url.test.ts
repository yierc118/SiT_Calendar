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
