import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'
import { processText } from '@/lib/process'
import { itemToRow } from '@/lib/supabase'
import { Item } from '@/lib/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const sender = formData.get('sender') as string ?? ''
    const subject = formData.get('subject') as string ?? '(no subject)'
    const body = (
      formData.get('stripped-text') ||
      formData.get('body-plain') ||
      ''
    ) as string

    // Build a rich capture string for Claude
    const captureText = [
      `Forwarded email`,
      `From: ${sender}`,
      `Subject: ${subject}`,
      body.trim() ? `\n${body.slice(0, 2000)}` : '',
    ].filter(Boolean).join('\n')

    const processed = await processText(captureText)

    const now = new Date().toISOString()
    const newItem: Item = {
      id: nanoid(),
      raw: captureText,
      ...processed,
      completed: false,
      createdAt: now,
      updatedAt: now,
    }

    const { error } = await supabase.from('items').insert(itemToRow(newItem))
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Inbound email error:', err)
    return NextResponse.json({ error: 'Failed to process email' }, { status: 500 })
  }
}
