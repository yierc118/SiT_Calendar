export interface RawExtraction {
  title: string
  start_at: string
  end_at: string | null
  location: string
  description: string
  rsvp_url: string
  image_url: string | null
  tags: string[]
}

export const EXTRACTION_PROMPT = `
You are an event data extractor. Extract structured event information from the content below.

Return ONLY a valid JSON object with exactly these fields (no markdown, no explanation):
{
  "title": "event title as a string",
  "start_at": "ISO 8601 datetime string in UTC, e.g. 2026-04-07T10:30:00Z. If year is ambiguous, use the nearest upcoming date.",
  "end_at": "ISO 8601 datetime string in UTC, or null if not found",
  "location": "venue name and address, or 'Online' if virtual",
  "description": "brief description of the event, max 300 chars",
  "rsvp_url": "the event registration or source URL",
  "image_url": "URL of the event cover image if found, or null",
  "tags": ["array", "of", "2-5", "relevant", "keyword", "tags"]
}

If a field cannot be determined, use an empty string "" (not null) except for end_at and image_url which may be null.
`.trim()
