import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { getOrCreateTeam } from '@/lib/team'
import { z } from 'zod'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const team = await getOrCreateTeam(session.user.id)
  return NextResponse.json({ team })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = z.object({ name: z.string().min(1).max(80) }).parse(await req.json())

  const member = await db.teamMember.findUnique({ where: { userId: session.user.id } })
  if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const team = await db.team.update({
    where: { id: member.teamId },
    data: { name },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, jobTitle: true } } } },
      invites: { where: { acceptedAt: null, expiresAt: { gt: new Date() } } },
    },
  })
  return NextResponse.json({ team })
}
