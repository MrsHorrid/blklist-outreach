import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { findCandidates, enrichCandidate, fallbackEnrichment } from '@/lib/ai'
import { verifyEmailSMTP, isGenericEmail } from '@/lib/agent-tools'
import { db } from '@/lib/db'
import { getTeamUserIds } from '@/lib/team'
import type { DiscoveryInput } from '@/lib/ai'

export const maxDuration = 120

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const input: DiscoveryInput = {
    industry:    url.searchParams.get('industry')    || 'DTC brands',
    geography:   url.searchParams.get('geography')   || 'United States',
    companySize: url.searchParams.get('companySize') || 'SMB (51-200)',
    adActivity:  url.searchParams.get('adActivity')  || 'Running paid ads',
    minRevenue:  url.searchParams.get('minRevenue')  || '$1M',
  }
  const count = Math.min(parseInt(url.searchParams.get('count') || '10'), 20)

  // Fetch existing lead domains to exclude from discovery
  const userIds = await getTeamUserIds(session.user.id)
  const existingLeads = await db.lead.findMany({
    where: { userId: { in: userIds } },
    select: { domain: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  const excludeDomains = existingLeads.map(l => l.domain).filter(Boolean)

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: object) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        } catch { /* client disconnected */ }
      }

      try {
        send('status', { message: `Searching for companies${excludeDomains.length > 0 ? ` (skipping ${excludeDomains.length} already in CRM)` : ''}…` })

        const candidates = await findCandidates(input, { excludeDomains, count })
        const slice = candidates.slice(0, count)

        send('status', { message: `Found ${slice.length} companies. Enriching contacts…` })
        for (const c of slice) send('candidate', c)

        // Phase 2 + 3: enrich + verify in parallel, stream each result as it finishes
        await Promise.all(
          slice.map(async (c) => {
            let enriched
            try {
              enriched = await enrichCandidate(c, input)
            } catch {
              enriched = fallbackEnrichment(c)
            }

            // Phase 3: SMTP verify
            let kept = true
            let smtpResult = 'unknown'
            const email = enriched.contactEmail

            if (!email || isGenericEmail(email)) {
              kept = !!enriched.contactLinkedIn
              smtpResult = 'generic'
            } else {
              smtpResult = await verifyEmailSMTP(email).catch(() => 'unknown')
              if (smtpResult === 'invalid') {
                kept = !!enriched.contactLinkedIn
                enriched = { ...enriched, contactEmail: enriched.contactLinkedIn ? '' : enriched.contactEmail }
              }
              if (smtpResult === 'unknown' && enriched.contactEmailSource === 'guessed' && !enriched.contactLinkedIn) {
                kept = false
              }
            }

            send('lead', { ...enriched, _smtpResult: smtpResult, _kept: kept })
          })
        )

        send('done', { count: slice.length })
      } catch (err) {
        send('error', { message: err instanceof Error ? err.message : 'Discovery failed' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
