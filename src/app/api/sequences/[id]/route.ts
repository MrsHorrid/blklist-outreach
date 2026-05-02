import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

async function getSequence(id: string, userId: string) {
  return (prisma as any).sequence.findFirst({ where: { id, userId } })
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const sequence = await (prisma as any).sequence.findFirst({
    where: { id, userId: session.user.id },
    include: {
      steps: { orderBy: { order: 'asc' } },
      _count: { select: { enrollments: true } },
    },
  })
  if (!sequence) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const stats = await (prisma as any).sequenceEnrollment.groupBy({
    by: ['status'],
    where: { sequenceId: id },
    _count: true,
  })
  const byStatus: Record<string, number> = {}
  for (const s of stats) byStatus[s.status] = s._count

  return NextResponse.json({ sequence: { ...sequence, stats: byStatus } })
}

const PatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const seq = await getSequence(id, session.user.id)
  if (!seq) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const updated = await (prisma as any).sequence.update({
    where: { id },
    data: parsed.data,
  })
  return NextResponse.json({ sequence: updated })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const seq = await getSequence(id, session.user.id)
  if (!seq) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await (prisma as any).sequence.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
