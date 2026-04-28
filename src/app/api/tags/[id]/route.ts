import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'

// DELETE /api/tags/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await db.tag.deleteMany({ where: { id, userId: session.user.id } })
  return NextResponse.json({ ok: true })
}

// PATCH /api/tags/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const tag = await db.tag.updateMany({
    where: { id, userId: session.user.id },
    data: { name: body.name, color: body.color },
  })
  return NextResponse.json({ tag })
}
