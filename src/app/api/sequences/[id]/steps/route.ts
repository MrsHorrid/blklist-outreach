import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

async function ownsSequence(id: string, userId: string) {
  return (prisma as any).sequence.findFirst({ where: { id, userId } })
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!await ownsSequence(id, session.user.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const steps = await (prisma as any).sequenceStep.findMany({
    where: { sequenceId: id },
    orderBy: { order: 'asc' },
  })
  return NextResponse.json({ steps })
}

const AddStepSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  delayDays: z.number().int().min(0).max(365).default(3),
  tone: z.enum(['confident', 'premium', 'casual', 'urgent']).default('confident'),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!await ownsSequence(id, session.user.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = AddStepSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Next order number
  const last = await (prisma as any).sequenceStep.findFirst({
    where: { sequenceId: id },
    orderBy: { order: 'desc' },
    select: { order: true },
  })
  const order = (last?.order ?? -1) + 1

  const step = await (prisma as any).sequenceStep.create({
    data: { ...parsed.data, sequenceId: id, order },
  })
  return NextResponse.json({ step }, { status: 201 })
}

// PUT — reorder: body is [{id, order}, ...]
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!await ownsSequence(id, session.user.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const items: { id: string; order: number }[] = await req.json()
  await Promise.all(
    items.map((item) =>
      (prisma as any).sequenceStep.update({ where: { id: item.id }, data: { order: item.order } })
    )
  )
  return NextResponse.json({ ok: true })
}
