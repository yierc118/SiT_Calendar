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
