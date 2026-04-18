import type { ExtractedEvent } from '@/types/event'
import { fetchUrlContent } from './fetch-url'
import { searchBrave } from './brave-search'
import { extractFromText, extractFromImage } from './gemini'

/** Orchestrates 3-tier URL extraction. Never throws — returns partial on total failure. */
export async function extractFromUrl(url: string): Promise<ExtractedEvent> {
  // Tier 1: direct fetch
  const fetchedContent = await fetchUrlContent(url)
  console.log(`[extract] tier1 fetch: ${fetchedContent ? `${fetchedContent.length} chars` : 'null'}`)
  if (fetchedContent) {
    try {
      const raw = await extractFromText(fetchedContent)
      console.log(`[extract] tier1 gemini success: "${raw.title}"`)
      return { ...raw, rsvp_url: raw.rsvp_url || url, extraction_partial: false }
    } catch (err) {
      console.log(`[extract] tier1 gemini failed:`, err)
      // fall through to tier 2
    }
  }

  // Tier 2: Brave Search fallback
  const searchContent = await searchBrave(url)
  console.log(`[extract] tier2 brave: ${searchContent ? `${searchContent.length} chars` : 'null'}`)
  if (searchContent) {
    try {
      const raw = await extractFromText(searchContent)
      console.log(`[extract] tier2 gemini success: "${raw.title}"`)
      return { ...raw, rsvp_url: raw.rsvp_url || url, extraction_partial: false }
    } catch (err) {
      console.log(`[extract] tier2 gemini failed:`, err)
      // fall through to tier 3
    }
  }

  // Tier 3: manual fallback — return empty fields with the URL
  console.log(`[extract] tier3 manual fallback for: ${url}`)
  return {
    title: '',
    start_at: '',
    end_at: null,
    location: '',
    description: '',
    rsvp_url: url,
    image_url: null,
    tags: [],
    extraction_partial: true,
  }
}

/** Extracts event details from a base64-encoded image. */
export async function extractFromImageData(
  base64Data: string,
  mimeType: string,
  imageUrl: string
): Promise<ExtractedEvent> {
  try {
    const raw = await extractFromImage(base64Data, mimeType)
    return { ...raw, image_url: raw.image_url || imageUrl, extraction_partial: false }
  } catch {
    return {
      title: '',
      start_at: '',
      end_at: null,
      location: '',
      description: '',
      rsvp_url: '',
      image_url: imageUrl,
      tags: [],
      extraction_partial: true,
    }
  }
}
