import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const LeadSchema = z.object({
  company: z.string().min(1),
  domain: z.string().min(1),
  emoji: z.string().optional(),
  industry: z.string().min(1),
  geography: z.string().optional(),
  companySize: z.string().optional(),
  revenue: z.string().optional(),
  description: z.string().optional(),
  contactName: z.string().optional(),
  contactRole: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactLinkedIn: z.string().optional(),
  brandTone: z.string().optional(),
  signals: z.array(z.string()).default([]),
  adChannels: z.array(z.string()).default([]),
  targetAudience: z.string().optional(),
  score: z.number().min(0).max(100).default(50),
  source: z.string().default('manual'),
  whyFit: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const industry = searchParams.get('industry')
    const search = searchParams.get('search')
    const tagId = searchParams.get('tagId')
    const sortBy = searchParams.get('sortBy') || 'updatedAt'
    const sortDir = (searchParams.get('sortDir') || 'desc') as 'asc' | 'desc'
    const limit = parseInt(searchParams.get('limit') || '100')

    const where: Record<string, unknown> = {}
    if (status && status !== 'ALL') where.status = status
    if (industry && industry !== 'ALL') where.industry = { contains: industry, mode: 'insensitive' }
    if (tagId) where.tags = { some: { tagId } }
    if (search) {
      where.OR = [
        { company: { contains: search, mode: 'insensitive' } },
        { domain: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { industry: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [leads, total] = await Promise.all([
      db.lead.findMany({
        where,
        orderBy: { [sortBy]: sortDir },
        take: limit,
        include: {
          _count: { select: { emails: true, notes: true } },
          tags: { include: { tag: true } },
        },
      }),
      db.lead.count({ where }),
    ])

    // Flatten tags for easier client consumption
    const leadsWithTags = leads.map(l => ({
      ...l,
      tags: l.tags.map(lt => lt.tag),
    }))

    return NextResponse.json({ leads: leadsWithTags, total })
  } catch (error) {
    console.error('[GET /api/leads]', error)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = LeadSchema.parse(body)

    const existing = await db.lead.findUnique({ where: { domain: data.domain } })
    if (existing) {
      return NextResponse.json(
        { error: 'A lead with this domain already exists', existingId: existing.id },
        { status: 409 }
      )
    }

    const lead = await db.lead.create({
      data: {
        ...data,
        contactEmail: data.contactEmail || null,
        activities: {
          create: { type: 'LEAD_CREATED', detail: `Added via ${data.source}` },
        },
      },
    })

    return NextResponse.json({ lead }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    console.error('[POST /api/leads]', error)
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }
}
