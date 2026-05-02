import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const seq = await (prisma as any).sequence.findFirst({
    where: { id, userId: session.user.id },
    include: { steps: { orderBy: { order: 'asc' } } },
  })
  if (!seq) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Overall enrollment counts by status
  const statusGroups = await (prisma as any).sequenceEnrollment.groupBy({
    by: ['status'],
    where: { sequenceId: id },
    _count: true,
  })
  const byStatus: Record<string, number> = {}
  for (const g of statusGroups) byStatus[g.status] = g._count
  const totalEnrolled = Object.values(byStatus as Record<string, number>).reduce((a, b) => a + b, 0)

  // Count emails sent per step index via Email records linked to enrollments
  // We track which step an email belongs to via the Email.tone field being set to step index
  // More precisely: count emails sent per day offset via activity
  // Simpler: total emails sent from this sequence
  const emailsSent = await prisma.email.count({
    where: {
      lead: { enrollments: { some: { sequenceId: id } } },
      status: { in: ['SENT', 'OPENED', 'REPLIED'] },
    },
  })
  const emailsOpened = await prisma.email.count({
    where: {
      lead: { enrollments: { some: { sequenceId: id } } },
      status: { in: ['OPENED', 'REPLIED'] },
    },
  })
  const emailsReplied = await prisma.email.count({
    where: {
      lead: { enrollments: { some: { sequenceId: id } } },
      status: 'REPLIED',
    },
  })

  // Recent 30-day send timeline
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const recentEmails = await prisma.email.findMany({
    where: {
      lead: { enrollments: { some: { sequenceId: id } } },
      status: { in: ['SENT', 'OPENED', 'REPLIED'] },
      sentAt: { gte: thirtyDaysAgo },
    },
    select: { sentAt: true },
    orderBy: { sentAt: 'asc' },
  })

  // Group by date
  const byDay: Record<string, number> = {}
  for (const e of recentEmails) {
    if (!e.sentAt) continue
    const day = e.sentAt.toISOString().slice(0, 10)
    byDay[day] = (byDay[day] ?? 0) + 1
  }

  return NextResponse.json({
    totalEnrolled,
    byStatus,
    emailsSent,
    emailsOpened,
    emailsReplied,
    openRate: emailsSent > 0 ? Math.round((emailsOpened / emailsSent) * 100) : 0,
    replyRate: emailsSent > 0 ? Math.round((emailsReplied / emailsSent) * 100) : 0,
    stepCount: seq.steps.length,
    timeline: byDay,
  })
}
