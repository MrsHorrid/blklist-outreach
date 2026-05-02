import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sequences = await (prisma as any).sequence.findMany({
    where: { userId: session.user.id },
    include: {
      steps: { orderBy: { order: 'asc' }, select: { id: true, order: true, delayDays: true, subject: true } },
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Compute quick stats per sequence
  const enriched = await Promise.all(
    sequences.map(async (seq: any) => {
      const stats = await (prisma as any).sequenceEnrollment.groupBy({
        by: ['status'],
        where: { sequenceId: seq.id },
        _count: true,
      })
      const byStatus: Record<string, number> = {}
      for (const s of stats) byStatus[s.status] = s._count
      return { ...seq, stats: byStatus }
    })
  )

  return NextResponse.json({ sequences: enriched })
}

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const sequence = await (prisma as any).sequence.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      userId: session.user.id,
    },
  })

  return NextResponse.json({ sequence }, { status: 201 })
}
