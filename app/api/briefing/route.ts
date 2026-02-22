import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { Item } from '@/lib/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a calm, thoughtful personal assistant giving a morning briefing. You have full visibility into the user's current items across their command center. Your job is to give them a short, intelligent synthesis — not a list, but a genuine read of their situation.

Write 2-4 sentences in natural paragraph form. Be specific (use actual item titles when relevant). Be direct and warm. Focus on:
- What deserves attention today and why
- Anything time-sensitive, overdue, or that seems to be sitting too long
- An honest read on how manageable things look overall

Tone: like a trusted advisor giving a quick verbal update before a busy day. Calm and grounding, never alarmist. If things look light or manageable, say so — that's reassuring, not boring.

Do not use bullet points. Do not start with "Good morning" or any generic opener. Just get right to it.`

export async function POST(req: NextRequest) {
  try {
    const { items }: { items: Item[] } = await req.json()

    const activeItems = items.filter(i => !i.completed)

    if (activeItems.length === 0) {
      return NextResponse.json({ briefing: "Your slate is clear. Nothing is sitting in any of your sections right now — a good moment to think about what you want to get ahead of." })
    }

    const summary = activeItems.map(item => {
      const parts = [`[${item.section.toUpperCase()}] ${item.title}`]
      if (item.notes) parts.push(`(${item.notes})`)
      if (item.delegatedTo) parts.push(`→ delegated to ${item.delegatedTo}`)
      if (item.dueDate) parts.push(`due ${item.dueDate}`)
      if (item.effort) parts.push(`effort: ${item.effort}`)
      if (item.context !== 'both') parts.push(`[${item.context}]`)
      return parts.join(' ')
    }).join('\n')

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Here are my current items:\n\n${summary}\n\nGive me my briefing.`
      }],
    })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type')

    return NextResponse.json({ briefing: content.text })
  } catch (err) {
    console.error('Briefing error:', err)
    return NextResponse.json({ error: 'Failed to generate briefing' }, { status: 500 })
  }
}
