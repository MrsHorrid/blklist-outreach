import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { enrichLead } from '@/lib/ai'
import type { ActivityType } from '@prisma/client'

export const maxDuration = 60

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params

    const lead = await db.lead.findUnique({
      where: { id },
      select: {
        id: true,
        company: true,
        domain: true,
        contactName: true,
        contactRole: true,
        contactEmail: true,
        contactLinkedIn: true,
      },
    })
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    const result = await enrichLead({
      company: lead.company,
      domain: lead.domain,
      contactName: lead.contactName ?? '',
      contactRole: lead.contactRole ?? '',
      currentEmail: lead.contactEmail ?? undefined,
      currentLinkedIn: lead.contactLinkedIn ?? undefined,
    })

    await db.lead.update({
      where: { id },
      data: {
        contactEmail: result.contactEmail || lead.contactEmail,
        contactLinkedIn: result.contactLinkedIn || lead.contactLinkedIn,
        signals: result.signals.length ? result.signals : undefined,
        description: result.description || undefined,
        activities: {
          create: { type: 'ENRICHED' as ActivityType, detail: `Contact data enriched — email source: ${result.contactEmailSource}` },
        },
      },
    })

    return NextResponse.json({ ok: true, result })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[POST /api/leads/:id/enrich]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
