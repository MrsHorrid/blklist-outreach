import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const TagSchema = z.object({
  name: z.string().min(1).max(30),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1'),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tags = await db.tag.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { leadTags: true } } },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ tags })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { name, color } = TagSchema.parse(body)

    const tag = await db.tag.create({
      data: { name, color, userId: session.user.id },
    })
    return NextResponse.json({ tag }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    // Unique constraint (same name + user)
    return NextResponse.json({ error: 'Tag already exists' }, { status: 409 })
  }
}
