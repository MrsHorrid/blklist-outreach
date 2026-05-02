import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const seq = await (prisma as any).sequence.findFirst({ where: { id, userId: session.user.id } })
  if (!seq) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const enrollments = await (prisma as any).sequenceEnrollment.findMany({
    where: { sequenceId: id },
    include: {
      lead: {
        select: { id: true, company: true, emoji: true, contactName: true, contactEmail: true },
      },
    },
    orderBy: { enrolledAt: 'desc' },
    take: 100,
  })

  return NextResponse.json({ enrollments })
}
