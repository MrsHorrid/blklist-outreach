import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { getTeamUserIds } from '@/lib/team'
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
    const session = await auth()
    const userIds = session?.user?.id ? await getTeamUserIds(session.user.id) : []

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const industry = searchParams.get('industry')
    const search = searchParams.get('search')
    const tagId = searchParams.get('tagId')
    const sortBy = searchParams.get('sortBy') || 'updatedAt'
    const sortDir = (searchParams.get('sortDir') || 'desc') as 'asc' | 'desc'
    const limit = parseInt(searchParams.get('limit') || '100')

    const where: Record<string, unknown> = userIds.length > 0 ? { userId: { in: userIds } } : {}
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

    // Fetch active enrollments for these leads
    const leadIds = leads.map(l => l.id)
    const enrollments = leadIds.length > 0
      ? await (db as any).sequenceEnrollment.findMany({
          where: { leadId: { in: leadIds }, status: { in: ['ACTIVE', 'PAUSED'] } },
          select: { leadId: true, id: true, status: true, currentStep: true, sequence: { select: { id: true, name: true } } },
        })
      : []
    const enrollmentMap = new Map(enrollments.map((e: any) => [e.leadId, e]))

    // Flatten tags for easier client consumption
    const leadsWithTags = leads.map(l => ({
      ...l,
      tags: l.tags.map(lt => lt.tag),
      activeEnrollment: enrollmentMap.get(l.id) ?? null,
    }))

    return NextResponse.json({ leads: leadsWithTags, total })
  } catch (error) {
    console.error('[GET /api/leads]', error)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const body = await req.json()
    const data = LeadSchema.parse(body)

    const existing = await db.lead.findFirst({ where: { domain: data.domain } })
    if (existing) {
      return NextResponse.json(
        { error: 'A lead with this domain already exists', existingId: existing.id },
        { status: 409 }
      )
    }

    const lead = await db.lead.create({
      data: {
        ...data,
        userId: session?.user?.id ?? null,
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
