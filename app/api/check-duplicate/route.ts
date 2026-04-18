import { NextResponse } from 'next/server'
import { checkDuplicate } from '@/lib/duplicates'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')
    if (!url) return NextResponse.json({ duplicate: null })
    const existing = await checkDuplicate(url)
    if (!existing) return NextResponse.json({ duplicate: null })
    return NextResponse.json({ duplicate: { id: existing.id, title: existing.title } })
  } catch (err) {
    console.error('[/api/check-duplicate]', err)
    return NextResponse.json({ duplicate: null })
  }
}
