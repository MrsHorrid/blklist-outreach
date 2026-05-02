import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const Schema = z.object({
  skipped: z.boolean().optional(),
  name: z.string().max(80).optional(),
  primaryUseCase: z.string().max(40).optional(),
  businessName: z.string().max(120).optional(),
  businessSize: z.string().max(40).optional(),
  businessDescription: z.string().max(1000).optional(),
  pitchAngle: z.string().max(500).optional(),
  targetAudience: z.string().max(80).optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = Schema.parse(await req.json())

    const update: Record<string, unknown> = { onboardingCompleted: true }

    if (!body.skipped) {
      if (body.name) update.name = body.name
      if (body.primaryUseCase) update.primaryUseCase = body.primaryUseCase
      if (body.businessName) update.businessName = body.businessName
      if (body.businessDescription) update.businessDescription = body.businessDescription
      if (body.pitchAngle) update.pitchAngle = body.pitchAngle
      // businessSize maps to targetSizes (single-element array for now — they're separate concepts but related)
      // For now, store team size in a separate concept by appending to targetSizes? No — keep clean.
      // Just save the description fields. We don't have a dedicated companySize-of-self field yet.
    }

    await db.user.update({
      where: { id: session.user.id },
      data: update,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error('[POST /api/onboarding]', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
