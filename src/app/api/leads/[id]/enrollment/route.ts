import { auth } from '@/auth'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const lead = await db.lead.findFirst({ where: { id, userId: session.user.id } })
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const enrollment = await (db as any).sequenceEnrollment.findFirst({
    where: { leadId: id, status: { in: ['ACTIVE', 'PAUSED'] } },
    include: { sequence: { select: { id: true, name: true } } },
    orderBy: { enrolledAt: 'desc' },
  })

  return NextResponse.json({ enrollment: enrollment ?? null })
}
