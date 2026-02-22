import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { ProcessedItem } from '@/lib/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = (today: string) => `You are an intelligent personal assistant helping to organize incoming information for a busy professional.

Today's date is ${today}. Use this to resolve relative dates like "tomorrow", "next week", "Friday", etc. into exact YYYY-MM-DD values.

When given raw input (a thought, email snippet, Slack message, task, note, etc.), analyze it and return a JSON object that categorizes it into the right place in their personal command center.

Return ONLY valid JSON with no additional text. Use this exact structure:
{
  "title": "concise, clear title (max 10 words)",
  "notes": "brief context or next action if helpful (optional, 1-2 sentences max)",
  "section": "now|this-week|watching|horizon|someday",
  "type": "task|note|reference|delegated|read",
  "effort": "low|medium|high",
  "context": "work|personal|both",
  "delegatedTo": "person's name if delegated (optional)",
  "dueDate": "YYYY-MM-DD if a specific date is mentioned (optional)"
}

Section guidance:
- "now": needs attention today, urgent, or blocking something
- "this-week": should happen this week but not urgent today
- "watching": delegated to someone else or waiting on a response — user needs to track but not act
- "horizon": important longer-term item, needs periodic attention, not this week
- "someday": low priority, nice-to-have, read later, reference material

Type guidance:
- "task": something to do
- "note": a thought, idea, or ad hoc note
- "reference": information to file away
- "delegated": something assigned to someone else
- "read": article, document, or content to review later

Effort guidance (only for tasks):
- "low": under 15 minutes
- "medium": 15 min – 1 hour
- "high": more than 1 hour or multi-step

Context guidance:
- "work": only if clearly and unambiguously professional
- "personal": only if clearly and unambiguously personal
- "both": default when there is any doubt — use this liberally

Be generous with "now" only if there's genuine urgency. When in doubt, use "this-week".`

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()

    if (!text?.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    const today = new Date().toISOString().slice(0, 10)
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: SYSTEM_PROMPT(today),
      messages: [{ role: 'user', content: text }],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    const rawText = content.text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    const processed: ProcessedItem = JSON.parse(rawText)
    return NextResponse.json(processed)
  } catch (err) {
    console.error('Process error:', err)
    return NextResponse.json({ error: 'Failed to process input' }, { status: 500 })
  }
}
