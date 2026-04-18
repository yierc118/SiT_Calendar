import { GoogleGenerativeAI } from '@google/generative-ai'
import { type RawExtraction, EXTRACTION_PROMPT } from './types'

function getModel() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
}

const GARBAGE_TITLES = [
  'log in', 'sign in', 'sign up', 'login', 'register', 'create account',
  'access denied', 'page not found', '404', 'just a moment', 'attention required',
  'cloudflare', 'are you a human', 'captcha',
]

function parseExtractionResponse(text: string): RawExtraction {
  // Strip markdown code blocks if Gemini wraps the JSON
  const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
  const parsed = JSON.parse(cleaned) as RawExtraction
  if (!parsed.title || !parsed.start_at) {
    throw new Error('Extraction missing required fields: title or start_at')
  }
  // Reject login/error pages masquerading as events
  const titleLower = parsed.title.toLowerCase()
  if (GARBAGE_TITLES.some((g) => titleLower.includes(g))) {
    throw new Error(`Extracted title looks like a gate page: "${parsed.title}"`)
  }
  return parsed
}

/** Extract event details from a text string (HTML content or search snippets) */
export async function extractFromText(content: string): Promise<RawExtraction> {
  const model = getModel()
  const prompt = `${EXTRACTION_PROMPT}\n\nContent:\n${content.slice(0, 12000)}`
  const result = await model.generateContent(prompt)
  return parseExtractionResponse(result.response.text())
}

/** Extract event details from an image (base64-encoded) */
export async function extractFromImage(
  base64Data: string,
  mimeType: string
): Promise<RawExtraction> {
  const model = getModel()
  const result = await model.generateContent([
    { inlineData: { mimeType, data: base64Data } },
    EXTRACTION_PROMPT,
  ])
  return parseExtractionResponse(result.response.text())
}
