import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the @google/generative-ai module
const mockGenerateContent = vi.fn().mockResolvedValue({
  response: {
    text: () => JSON.stringify({
      title: 'Test Event',
      start_at: '2026-04-07T10:30:00Z',
      end_at: '2026-04-07T13:00:00Z',
      location: 'Test Venue, Singapore',
      description: 'A test event description.',
      rsvp_url: 'https://lu.ma/test-event',
      image_url: null,
      tags: ['tech', 'networking'],
    }),
  },
})

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return { generateContent: mockGenerateContent }
    }
  },
}))

import { extractFromText } from './gemini'

describe('extractFromText', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key'
  })

  it('parses valid JSON response from Gemini', async () => {
    const result = await extractFromText('some event content')
    expect(result.title).toBe('Test Event')
    expect(result.start_at).toBe('2026-04-07T10:30:00Z')
    expect(result.tags).toEqual(['tech', 'networking'])
  })

  it('throws if Gemini returns invalid JSON', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => 'not json' },
    })

    await expect(extractFromText('bad content')).rejects.toThrow()
  })
})
