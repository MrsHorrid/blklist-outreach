import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'

type Params = { params: Promise<{ token: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params

  const invite = await db.teamInvite.findUnique({
    where: { token },
    include: { team: { select: { name: true } } },
  })

  if (!invite) return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 })
  if (invite.acceptedAt) return NextResponse.json({ error: 'This invite has already been used' }, { status: 410 })
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: 'This invite has expired' }, { status: 410 })

  return NextResponse.json({ invite: { id: invite.id, email: invite.email, role: invite.role, teamName: invite.team.name } })
}

export async function POST(_req: NextRequest, { params }: Params) {
  const { token } = await params
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const invite = await db.teamInvite.findUnique({
    where: { token },
    include: { team: true },
  })

  if (!invite) return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 })
  if (invite.acceptedAt) return NextResponse.json({ error: 'Already used' }, { status: 410 })
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: 'Expired' }, { status: 410 })

  // Check if already on a team
  const existing = await db.teamMember.findUnique({ where: { userId: session.user.id } })
  if (existing) {
    if (existing.teamId === invite.teamId) return NextResponse.json({ error: 'Already on this team' }, { status: 409 })
    // Leave old team first
    await db.teamMember.delete({ where: { userId: session.user.id } })
  }

  await db.$transaction([
    db.teamMember.create({ data: { teamId: invite.teamId, userId: session.user.id, role: invite.role } }),
    db.teamInvite.update({ where: { token }, data: { acceptedAt: new Date() } }),
  ])

  return NextResponse.json({ ok: true, teamName: invite.team.name })
}
