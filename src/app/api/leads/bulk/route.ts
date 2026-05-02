import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const Schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('delete'),   leadIds: z.array(z.string()).min(1) }),
  z.object({ action: z.literal('tag'),      leadIds: z.array(z.string()).min(1), tagId: z.string() }),
  z.object({ action: z.literal('untag'),    leadIds: z.array(z.string()).min(1), tagId: z.string() }),
  z.object({ action: z.literal('enroll'),   leadIds: z.array(z.string()).min(1), sequenceId: z.string() }),
  z.object({ action: z.literal('status'),   leadIds: z.array(z.string()).min(1), status: z.string() }),
  z.object({ action: z.literal('export'),   leadIds: z.array(z.string()).min(1) }),
])

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { action, leadIds } = parsed.data

  // Verify ownership of all leads
  const owned = await prisma.lead.findMany({
    where: { id: { in: leadIds }, userId: session.user.id },
    select: { id: true },
  })
  const ownedIds = owned.map((l) => l.id)
  if (ownedIds.length === 0) return NextResponse.json({ error: 'No owned leads found' }, { status: 403 })

  if (action === 'delete') {
    await prisma.lead.deleteMany({ where: { id: { in: ownedIds } } })
    return NextResponse.json({ affected: ownedIds.length })
  }

  if (action === 'status') {
    await prisma.lead.updateMany({ where: { id: { in: ownedIds } }, data: { status: parsed.data.status as any } })
    return NextResponse.json({ affected: ownedIds.length })
  }

  if (action === 'tag') {
    const { tagId } = parsed.data as { action: 'tag'; leadIds: string[]; tagId: string }
    const tag = await prisma.tag.findFirst({ where: { id: tagId, userId: session.user.id } })
    if (!tag) return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    await Promise.all(
      ownedIds.map((leadId) =>
        prisma.leadTag.upsert({
          where: { leadId_tagId: { leadId, tagId } },
          create: { leadId, tagId },
          update: {},
        })
      )
    )
    return NextResponse.json({ affected: ownedIds.length })
  }

  if (action === 'untag') {
    const { tagId } = parsed.data as { action: 'untag'; leadIds: string[]; tagId: string }
    await prisma.leadTag.deleteMany({ where: { leadId: { in: ownedIds }, tagId } })
    return NextResponse.json({ affected: ownedIds.length })
  }

  if (action === 'enroll') {
    const seq = await (prisma as any).sequence.findFirst({
      where: { id: parsed.data.sequenceId, userId: session.user.id },
    })
    if (!seq) return NextResponse.json({ error: 'Sequence not found' }, { status: 404 })

    const now = new Date()
    let enrolled = 0
    for (const leadId of ownedIds) {
      try {
        await (prisma as any).sequenceEnrollment.create({
          data: { sequenceId: seq.id, leadId, userId: session.user.id, status: 'ACTIVE', currentStep: 0, nextSendAt: now },
        })
        enrolled++
      } catch { /* already enrolled */ }
    }
    return NextResponse.json({ enrolled, skipped: ownedIds.length - enrolled })
  }

  if (action === 'export') {
    const leads = await prisma.lead.findMany({
      where: { id: { in: ownedIds } },
      include: { tags: { include: { tag: true } } },
    })
    const rows = [
      'Company,Domain,Industry,Contact Name,Contact Role,Contact Email,Contact LinkedIn,Score,Status,Tags',
      ...leads.map((l) => [
        `"${l.company}"`,
        l.domain,
        `"${l.industry}"`,
        `"${l.contactName || ''}"`,
        `"${l.contactRole || ''}"`,
        l.contactEmail || '',
        l.contactLinkedIn || '',
        l.score,
        l.status,
        `"${l.tags.map((t) => t.tag.name).join(', ')}"`,
      ].join(',')),
    ].join('\n')

    return new Response(rows, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="blklist-leads.csv"',
      },
    })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
