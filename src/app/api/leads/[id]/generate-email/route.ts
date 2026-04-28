import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { generateOutreachEmail, EmailTone } from '@/lib/ai'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const Schema = z.object({
  tone: z.enum(['confident', 'premium', 'casual', 'urgent']).default('confident'),
})

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await req.json()
    const { tone } = Schema.parse(body)

    const session = await auth()

    const [lead, user] = await Promise.all([
      db.lead.findUnique({ where: { id } }),
      session?.user?.id
        ? db.user.findUnique({
            where: { id: session.user.id },
            select: {
              name: true,
              jobTitle: true,
              businessName: true,
              businessDescription: true,
              pitchAngle: true,
            },
          })
        : null,
    ])

    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    const email = await generateOutreachEmail({
      company: lead.company,
      industry: lead.industry,
      contactName: lead.contactName || 'the team',
      contactRole: lead.contactRole || 'Marketing Lead',
      brandNotes: lead.description || lead.whyFit || `${lead.company} is a ${lead.industry} brand`,
      signals: lead.signals,
      tone: tone as EmailTone,
      whyFit: lead.whyFit ?? undefined,
      senderName: user?.name ?? undefined,
      senderTitle: user?.jobTitle ?? undefined,
      senderBusiness: user?.businessName ?? undefined,
      senderDescription: user?.businessDescription ?? undefined,
      senderPitch: user?.pitchAngle ?? undefined,
    })

    return NextResponse.json(email)
  } catch (error) {
    console.error('[POST /api/leads/:id/generate-email]', error)
    return NextResponse.json({ error: 'Email generation failed' }, { status: 500 })
  }
}
