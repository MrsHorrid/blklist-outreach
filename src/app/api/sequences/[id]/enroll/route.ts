import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const Schema = z.object({ leadIds: z.array(z.string()).min(1) })

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const seq = await (prisma as any).sequence.findFirst({ where: { id, userId: session.user.id } })
  if (!seq) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Sequence must have at least 1 step
  const firstStep = await (prisma as any).sequenceStep.findFirst({
    where: { sequenceId: id },
    orderBy: { order: 'asc' },
  })
  if (!firstStep) return NextResponse.json({ error: 'Sequence has no steps' }, { status: 400 })

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const now = new Date()
  let enrolled = 0

  for (const leadId of parsed.data.leadIds) {
    try {
      await (prisma as any).sequenceEnrollment.create({
        data: {
          sequenceId: id,
          leadId,
          userId: session.user.id,
          status: 'ACTIVE',
          currentStep: 0,
          nextSendAt: now, // send first email immediately
        },
      })
      enrolled++
    } catch {
      // @@unique([sequenceId, leadId]) violation — already enrolled, skip
    }
  }

  return NextResponse.json({ enrolled, skipped: parsed.data.leadIds.length - enrolled })
}
