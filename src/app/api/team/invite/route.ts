import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await db.teamMember.findUnique({ where: { userId: session.user.id } })
  if (!member) return NextResponse.json({ invites: [] })

  const invites = await db.teamInvite.findMany({
    where: { teamId: member.teamId, acceptedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ invites })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email, role } = z.object({
    email: z.string().email(),
    role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
  }).parse(await req.json())

  const myMember = await db.teamMember.findUnique({ where: { userId: session.user.id } })
  if (!myMember || (myMember.role !== 'OWNER' && myMember.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Check if already a member
  const existingUser = await db.user.findUnique({ where: { email } })
  if (existingUser) {
    const alreadyMember = await db.teamMember.findUnique({ where: { userId: existingUser.id } })
    if (alreadyMember?.teamId === myMember.teamId) {
      return NextResponse.json({ error: 'This person is already on your team' }, { status: 409 })
    }
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const invite = await db.teamInvite.upsert({
    where: { teamId_email: { teamId: myMember.teamId, email } },
    create: { teamId: myMember.teamId, email, role, expiresAt },
    update: { role, expiresAt, acceptedAt: null },
  })

  return NextResponse.json({ invite })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { inviteId } = await req.json()

  const myMember = await db.teamMember.findUnique({ where: { userId: session.user.id } })
  if (!myMember || (myMember.role !== 'OWNER' && myMember.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const invite = await db.teamInvite.findUnique({ where: { id: inviteId } })
  if (!invite || invite.teamId !== myMember.teamId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.teamInvite.delete({ where: { id: inviteId } })
  return NextResponse.json({ ok: true })
}
