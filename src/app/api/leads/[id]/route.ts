import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { LeadStatus } from '@prisma/client'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const lead = await db.lead.findUnique({
      where: { id },
      include: {
        emails: { orderBy: { createdAt: 'desc' } },
        notes: { orderBy: { createdAt: 'desc' } },
        activities: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    })
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    return NextResponse.json({ lead })
  } catch (error) {
    console.error('[GET /api/leads/:id]', error)
    return NextResponse.json({ error: 'Failed to fetch lead' }, { status: 500 })
  }
}

const UpdateSchema = z.object({
  status: z.string().optional(),
  score: z.number().min(0).max(100).optional(),
  company: z.string().optional(),
  domain: z.string().optional(),
  industry: z.string().optional(),
  geography: z.string().optional(),
  companySize: z.string().optional(),
  revenue: z.string().optional(),
  description: z.string().optional(),
  contactName: z.string().optional(),
  contactRole: z.string().optional(),
  contactEmail: z.string().optional(),
  contactLinkedIn: z.string().optional(),
  brandTone: z.string().optional(),
  signals: z.array(z.string()).optional(),
  targetAudience: z.string().optional(),
  whyFit: z.string().optional(),
})

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await req.json()
    const data = UpdateSchema.parse(body)
    const prev = await db.lead.findUnique({ where: { id }, select: { status: true } })

    const lead = await db.lead.update({
      where: { id },
      data: {
        ...data,
        status: data.status as LeadStatus | undefined,
        ...(data.status && data.status !== prev?.status && {
          activities: {
            create: {
              type: 'STATUS_CHANGED',
              detail: `${prev?.status} → ${data.status}`,
            },
          },
        }),
      },
    })
    return NextResponse.json({ lead })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    console.error('[PATCH /api/leads/:id]', error)
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    await db.lead.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[DELETE /api/leads/:id]', error)
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 })
  }
}
