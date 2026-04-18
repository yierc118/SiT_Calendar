import { NextResponse } from 'next/server'
import { extractFromUrl, extractFromImageData } from '@/lib/extraction/extract'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') ?? ''

    if (contentType.includes('application/json')) {
      // URL extraction
      const { url } = await request.json() as { url: string }
      if (!url || typeof url !== 'string') {
        return NextResponse.json({ error: 'url is required' }, { status: 400 })
      }

      const result = await extractFromUrl(url)
      return NextResponse.json(result)
    }

    if (contentType.includes('multipart/form-data')) {
      // Image extraction
      const formData = await request.formData()
      const file = formData.get('image') as File | null

      if (!file) {
        return NextResponse.json({ error: 'image is required' }, { status: 400 })
      }

      // Upload image to Supabase Storage
      const supabase = createServiceClient()
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100)
      const fileName = `uploads/${Date.now()}-${safeName}`
      const arrayBuffer = await file.arrayBuffer()
      const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(fileName, arrayBuffer, { contentType: file.type, upsert: false })

      if (uploadError) {
        return NextResponse.json({ error: 'Image upload failed' }, { status: 500 })
      }

      const { data: { publicUrl } } = supabase.storage
        .from('event-images')
        .getPublicUrl(fileName)

      // Convert to base64 for Gemini Vision
      const bytes = new Uint8Array(arrayBuffer)
      const base64 = Buffer.from(bytes).toString('base64')

      const result = await extractFromImageData(base64, file.type, publicUrl)
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Unsupported content type' }, { status: 415 })
  } catch (err) {
    console.error('[/api/extract]', err)
    return NextResponse.json({ error: 'Extraction failed' }, { status: 500 })
  }
}
