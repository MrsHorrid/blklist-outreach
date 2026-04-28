import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'

// PUT /api/leads/[id]/tags — set tags for a lead (replaces all)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: leadId } = await params
  const { tagIds } = await req.json() as { tagIds: string[] }

  // Verify tags belong to the user
  const validTags = await db.tag.findMany({
    where: { id: { in: tagIds }, userId: session.user.id },
    select: { id: true },
  })
  const validIds = validTags.map(t => t.id)

  // Replace all lead tags
  await db.leadTag.deleteMany({ where: { leadId } })
  if (validIds.length > 0) {
    await db.leadTag.createMany({
      data: validIds.map(tagId => ({ leadId, tagId })),
    })
  }

  return NextResponse.json({ ok: true })
}

// GET /api/leads/[id]/tags
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: leadId } = await params
  const leadTags = await db.leadTag.findMany({
    where: { leadId },
    include: { tag: true },
  })
  return NextResponse.json({ tags: leadTags.map(lt => lt.tag) })
}
