import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const Schema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  tone: z.string().optional(),
})

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    const { id } = await params
    const body = await req.json()
    const { subject, body: emailBody, tone } = Schema.parse(body)

    const lead = await db.lead.findUnique({ where: { id } })
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    if (!lead.contactEmail) return NextResponse.json({ error: 'No contact email on this lead' }, { status: 400 })

    // Load sender identity + template from user profile
    let senderName: string | undefined
    let gmailEmail: string | undefined
    let gmailRefreshToken: string | undefined
    let template: Awaited<ReturnType<typeof db.emailTemplate.findFirst>> = null

    if (session?.user?.id) {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, gmailEmail: true, gmailRefreshToken: true, gmailConnected: true },
      })
      if (user) {
        senderName = user.name ?? undefined
        if (user.gmailConnected && user.gmailEmail && user.gmailRefreshToken) {
          gmailEmail = user.gmailEmail
          gmailRefreshToken = user.gmailRefreshToken
        }
      }

      template = await db.emailTemplate.findFirst({
        where: { userId: session.user.id, isDefault: true },
      })
    }

    const email = await db.email.create({
      data: {
        leadId: id,
        subject,
        body: emailBody,
        tone,
        status: 'SENT',
        sentAt: new Date(),
      },
    })

    // Replace common template tokens
    const firstName = lead.contactName?.split(' ')[0] || ''
    const replaceTokens = (s: string) => s
      .replace(/\{\{firstName\}\}/g, firstName)
      .replace(/\{\{lastName\}\}/g, lead.contactName?.split(' ').slice(1).join(' ') || '')
      .replace(/\{\{contactName\}\}/g, lead.contactName || '')
      .replace(/\{\{company\}\}/g, lead.company)
      .replace(/\{\{industry\}\}/g, lead.industry)

    await sendEmail({
      to: lead.contactEmail,
      subject: replaceTokens(subject),
      body: replaceTokens(emailBody),
      trackingId: email.trackingId!,
      fromName: senderName,
      gmailEmail,
      gmailRefreshToken,
      template,
    })

    await db.lead.update({
      where: { id },
      data: {
        status: lead.status === 'DISCOVERED' ? 'CONTACTED' : lead.status,
        activities: {
          create: { type: 'EMAIL_SENT', detail: subject },
        },
      },
    })

    return NextResponse.json({ ok: true, emailId: email.id })
  } catch (error) {
    console.error('[POST /api/leads/:id/send-email]', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
