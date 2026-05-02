import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

// Allow large payloads (multiple base64 images)
export const runtime = 'nodejs'
export const maxDuration = 30

// Accept https URLs, data: URIs (uploaded images), or empty string
const imageField = z
  .string()
  .max(8 * 1024 * 1024) // ~6MB raw → up to ~8MB base64
  .refine(
    (v) => v === '' || /^https?:\/\//i.test(v) || /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/i.test(v),
    { message: 'Image must be a URL or uploaded image (png, jpg, gif, webp, svg)' }
  )
  .optional()

const Schema = z.object({
  name: z.string().max(80).optional(),
  isDefault: z.boolean().optional(),
  headerImageUrl: imageField,
  headerHtml: z.string().max(2000).optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  fontFamily: z.string().max(60).optional(),
  signatureName: z.string().max(80).optional(),
  signatureTitle: z.string().max(120).optional(),
  signatureCompany: z.string().max(120).optional(),
  signatureImageUrl: imageField,
  signaturePhone: z.string().max(40).optional(),
  signatureWebsite: z.string().max(200).optional().or(z.literal('')),
  signatureLinkedIn: z.string().max(200).optional().or(z.literal('')),
  footerText: z.string().max(500).optional(),
  footerImageUrl: imageField,
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let template = await db.emailTemplate.findFirst({
    where: { userId: session.user.id, isDefault: true },
  })

  if (!template) {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, jobTitle: true, businessName: true, phone: true },
    })
    template = await db.emailTemplate.create({
      data: {
        userId: session.user.id,
        name: 'Default',
        isDefault: true,
        signatureName: user?.name ?? null,
        signatureTitle: user?.jobTitle ?? null,
        signatureCompany: user?.businessName ?? null,
        signaturePhone: user?.phone ?? null,
      },
    })
  }

  return NextResponse.json({ template })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = Schema.parse(await req.json())

    // Empty strings → null
    const data = {
      ...body,
      headerImageUrl:    body.headerImageUrl    === '' ? null : body.headerImageUrl,
      signatureImageUrl: body.signatureImageUrl === '' ? null : body.signatureImageUrl,
      signatureWebsite:  body.signatureWebsite  === '' ? null : body.signatureWebsite,
      signatureLinkedIn: body.signatureLinkedIn === '' ? null : body.signatureLinkedIn,
      footerImageUrl:    body.footerImageUrl    === '' ? null : body.footerImageUrl,
    }

    const existing = await db.emailTemplate.findFirst({
      where: { userId: session.user.id, isDefault: true },
    })

    const template = existing
      ? await db.emailTemplate.update({ where: { id: existing.id }, data })
      : await db.emailTemplate.create({ data: { ...data, userId: session.user.id, name: body.name || 'Default', isDefault: true } })

    return NextResponse.json({ template })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error('[PATCH /api/templates]', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
