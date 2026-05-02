import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { getAIProvider } from '@/lib/ai-provider'

const STEP_PROMPTS = [
  {
    label: 'First touch',
    instruction: 'Write a first cold outreach email. Open with a specific observation about the company, pitch the value concisely, end with a soft CTA for a 15-min chat.',
  },
  {
    label: 'Follow-up',
    instruction: 'Write a short follow-up email (max 80 words). Acknowledge you reached out before, add one new angle or insight, keep the CTA gentle.',
  },
  {
    label: 'Final touch / breakup',
    instruction: 'Write a brief "last note" email. Be direct, mention this is the last outreach, leave the door open without pressure. Under 50 words.',
  },
]

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { stepNumber = 0, tone = 'confident', sequenceName = '' } = await req.json()

  const stepDef = STEP_PROMPTS[Math.min(stepNumber, STEP_PROMPTS.length - 1)]
  const { apiKey, baseUrl, model, extraHeaders } = getAIProvider()

  const prompt = `You are a senior B2B outreach copywriter. Write a cold email step for a sequence called "${sequenceName}".

Step type: ${stepDef.label}
Tone: ${tone}
Instruction: ${stepDef.instruction}

Use these tokens where appropriate: {{firstName}}, {{company}}, {{industry}}
Keep the email under 150 words. Sign off naturally — don't add an explicit signature.

Return JSON ONLY:
{"subject": "...", "body": "..."}`

  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify({ model, max_tokens: 512, messages: [{ role: 'user', content: prompt }] }),
  })

  if (!res.ok) return NextResponse.json({ error: 'AI error' }, { status: 500 })
  const data = await res.json()
  const text = data.choices[0].message.content as string

  try {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    const json = JSON.parse(text.slice(start, end + 1))
    return NextResponse.json(json)
  } catch {
    return NextResponse.json({ error: 'Parse error', raw: text }, { status: 500 })
  }
}
