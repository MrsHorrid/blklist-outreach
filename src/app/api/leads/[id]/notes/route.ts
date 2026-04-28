import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const Schema = z.object({
  content: z.string().min(1),
  author: z.string().default('You'),
})

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await req.json()
    const { content, author } = Schema.parse(body)

    const note = await db.note.create({
      data: { leadId: id, content, author },
    })

    await db.activity.create({
      data: { leadId: id, type: 'NOTE_ADDED', detail: content.slice(0, 60) },
    })

    return NextResponse.json({ note }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error' }, { status: 400 })
    }
    console.error('[POST /api/leads/:id/notes]', error)
    return NextResponse.json({ error: 'Failed to add note' }, { status: 500 })
  }
}
