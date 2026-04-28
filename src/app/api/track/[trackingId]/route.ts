import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Params = { params: Promise<{ trackingId: string }> }

const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { trackingId } = await params
    const email = await db.email.findUnique({ where: { trackingId } })

    if (email && email.status === 'SENT') {
      await db.email.update({
        where: { trackingId },
        data: {
          status: 'OPENED',
          openedAt: new Date(),
          opens: { increment: 1 },
        },
      })
      await db.activity.create({
        data: { leadId: email.leadId, type: 'EMAIL_OPENED', detail: email.subject },
      })
      await db.lead.update({
        where: { id: email.leadId },
        data: { status: 'OPENED' },
      })
    } else if (email) {
      await db.email.update({
        where: { trackingId },
        data: { opens: { increment: 1 } },
      })
    }
  } catch {
    // silently fail — never break email rendering
  }

  return new NextResponse(PIXEL, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
