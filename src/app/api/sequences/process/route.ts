import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

// POST /api/sequences/process
// Sends all due sequence emails. In production, call this every 15 min via cron.
// In dev, the sequences UI has a "Process Queue" button.
export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()

  // 1. Auto-pause enrollments where the lead has replied to any email
  const repliedLeads = await prisma.email.findMany({
    where: { status: 'REPLIED' },
    select: { leadId: true },
    distinct: ['leadId'],
  })
  const repliedLeadIds = repliedLeads.map((e) => e.leadId)
  if (repliedLeadIds.length > 0) {
    await (prisma as any).sequenceEnrollment.updateMany({
      where: {
        leadId: { in: repliedLeadIds },
        status: 'ACTIVE',
        userId: session.user.id,
      },
      data: { status: 'REPLIED', completedAt: now },
    })
  }

  // 2. Find due enrollments
  const due = await (prisma as any).sequenceEnrollment.findMany({
    where: {
      status: 'ACTIVE',
      nextSendAt: { lte: now },
      userId: session.user.id,
    },
    include: {
      sequence: { include: { steps: { orderBy: { order: 'asc' } } } },
      lead: true,
    },
    take: 20, // process in batches
  })

  // Load sender identity once
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, gmailEmail: true, gmailRefreshToken: true, gmailConnected: true },
  })
  const template = await prisma.emailTemplate.findFirst({
    where: { userId: session.user.id, isDefault: true },
  })

  let processed = 0
  let completed = 0
  const errors: string[] = []

  for (const enrollment of due) {
    try {
      const steps = enrollment.sequence.steps
      const step = steps[enrollment.currentStep]
      if (!step) continue

      const lead = enrollment.lead
      if (!lead.contactEmail) continue

      // Token replacement
      const firstName = lead.contactName?.split(' ')[0] || ''
      const replace = (s: string) => s
        .replace(/\{\{firstName\}\}/g, firstName)
        .replace(/\{\{lastName\}\}/g, lead.contactName?.split(' ').slice(1).join(' ') || '')
        .replace(/\{\{contactName\}\}/g, lead.contactName || '')
        .replace(/\{\{company\}\}/g, lead.company)
        .replace(/\{\{industry\}\}/g, lead.industry || '')

      // Create email record
      const emailRecord = await prisma.email.create({
        data: {
          leadId: lead.id,
          subject: replace(step.subject),
          body: replace(step.body),
          tone: step.tone,
          status: 'SENT',
          sentAt: now,
        },
      })

      // Send
      await sendEmail({
        to: lead.contactEmail,
        subject: replace(step.subject),
        body: replace(step.body),
        trackingId: emailRecord.trackingId!,
        fromName: user?.name ?? undefined,
        gmailEmail: user?.gmailConnected && user?.gmailEmail ? user.gmailEmail : undefined,
        gmailRefreshToken: user?.gmailRefreshToken ?? undefined,
        template,
      })

      // Update lead status
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: lead.status === 'DISCOVERED' ? 'CONTACTED' : lead.status,
          activities: { create: { type: 'EMAIL_SENT', detail: `[Seq: ${enrollment.sequence.name}] ${step.subject}` } },
        },
      })

      // Advance enrollment
      const isLast = enrollment.currentStep >= steps.length - 1
      if (isLast) {
        await (prisma as any).sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { status: 'COMPLETED', completedAt: now, nextSendAt: null },
        })
        completed++
      } else {
        const nextStep = steps[enrollment.currentStep + 1]
        const nextSendAt = new Date(now.getTime() + nextStep.delayDays * 24 * 60 * 60 * 1000)
        await (prisma as any).sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { currentStep: enrollment.currentStep + 1, nextSendAt },
        })
      }

      processed++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${enrollment.lead.company}: ${msg}`)
      console.error('[sequence:process]', enrollment.lead.company, err)
    }
  }

  return NextResponse.json({ processed, completed, errors, due: due.length })
}
