import { describe, it, expect, vi } from 'vitest'
import { checkDuplicate } from './duplicates'

const mockEvent = {
  id: 'abc-123',
  title: 'Women in Tech Meetup',
  start_at: '2026-04-07T10:30:00Z',
  end_at: null,
  location: 'WeWork Funan',
  description: 'Networking event.',
  rsvp_url: 'https://lu.ma/test-event',
  image_url: null,
  tags: ['networking'],
  status: 'approved' as const,
  submitter_name: null,
  submitter_email: null,
  submitted_at: '2026-04-01T10:00:00Z',
  approved_at: '2026-04-01T11:00:00Z',
  approved_by: 'mod@sit.sg',
}

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'abc-123',
          title: 'Women in Tech Meetup',
          start_at: '2026-04-07T10:30:00Z',
          end_at: null,
          location: 'WeWork Funan',
          description: 'Networking event.',
          rsvp_url: 'https://lu.ma/test-event',
          image_url: null,
          tags: ['networking'],
          status: 'approved',
          submitter_name: null,
          submitter_email: null,
          submitted_at: '2026-04-01T10:00:00Z',
          approved_at: '2026-04-01T11:00:00Z',
          approved_by: 'mod@sit.sg',
        },
        error: null,
      }),
    }),
  }),
}))

describe('checkDuplicate', () => {
  it('returns the existing event when a matching rsvp_url is found', async () => {
    const result = await checkDuplicate('https://lu.ma/test-event')
    expect(result).not.toBeNull()
    expect(result!.id).toBe('abc-123')
  })

  it('returns null for a null url', async () => {
    const result = await checkDuplicate(null)
    expect(result).toBeNull()
  })
})
