import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { role } = await req.json()
  if (!['ADMIN', 'MEMBER'].includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

  const myMember = await db.teamMember.findUnique({ where: { userId: session.user.id } })
  if (!myMember || myMember.role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const target = await db.teamMember.findUnique({ where: { id } })
  if (!target || target.teamId !== myMember.teamId) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (target.role === 'OWNER') return NextResponse.json({ error: 'Cannot change owner role' }, { status: 400 })

  const updated = await db.teamMember.update({ where: { id }, data: { role } })
  return NextResponse.json({ member: updated })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const myMember = await db.teamMember.findUnique({ where: { userId: session.user.id } })
  if (!myMember || (myMember.role !== 'OWNER' && myMember.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const target = await db.teamMember.findUnique({ where: { id } })
  if (!target || target.teamId !== myMember.teamId) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (target.role === 'OWNER') return NextResponse.json({ error: 'Cannot remove owner' }, { status: 400 })
  if (target.userId === session.user.id) return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })

  await db.teamMember.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
