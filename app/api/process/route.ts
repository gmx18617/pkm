import { NextRequest, NextResponse } from 'next/server'
import { processText } from '@/lib/process'

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()
    if (!text?.trim()) return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    const processed = await processText(text)
    return NextResponse.json(processed)
  } catch (err) {
    console.error('Process error:', err)
    return NextResponse.json({ error: 'Failed to process input' }, { status: 500 })
  }
}
