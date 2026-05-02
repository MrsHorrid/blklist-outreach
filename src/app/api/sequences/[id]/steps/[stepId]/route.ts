import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

async function ownsStep(stepId: string, userId: string) {
  return (prisma as any).sequenceStep.findFirst({
    where: { id: stepId, sequence: { userId } },
    include: { sequence: true },
  })
}

const PatchSchema = z.object({
  subject: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  delayDays: z.number().int().min(0).max(365).optional(),
  tone: z.enum(['confident', 'premium', 'casual', 'urgent']).optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; stepId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { stepId } = await params

  const step = await ownsStep(stepId, session.user.id)
  if (!step) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const updated = await (prisma as any).sequenceStep.update({ where: { id: stepId }, data: parsed.data })
  return NextResponse.json({ step: updated })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; stepId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, stepId } = await params

  const step = await ownsStep(stepId, session.user.id)
  if (!step) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await (prisma as any).sequenceStep.delete({ where: { id: stepId } })

  // Re-index remaining steps
  const remaining = await (prisma as any).sequenceStep.findMany({
    where: { sequenceId: id },
    orderBy: { order: 'asc' },
  })
  await Promise.all(
    remaining.map((s: any, i: number) =>
      (prisma as any).sequenceStep.update({ where: { id: s.id }, data: { order: i } })
    )
  )

  return NextResponse.json({ ok: true })
}
