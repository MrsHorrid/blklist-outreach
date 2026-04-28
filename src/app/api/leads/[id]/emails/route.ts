import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const Schema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  tone: z.string().optional(),
})

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await req.json()
    const data = Schema.parse(body)

    const email = await db.email.create({
      data: { leadId: id, subject: data.subject, body: data.body, tone: data.tone, status: 'DRAFT' },
    })

    return NextResponse.json({ email }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/leads/:id/emails]', error)
    return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 })
  }
}
