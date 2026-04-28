import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const ProfileSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  jobTitle: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  businessName: z.string().max(100).optional(),
  businessDescription: z.string().max(1000).optional(),
  pitchAngle: z.string().max(500).optional(),
  targetIndustries: z.array(z.string()).optional(),
  targetGeographies: z.array(z.string()).optional(),
  targetSizes: z.array(z.string()).optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, name: true, email: true, jobTitle: true, phone: true,
      businessName: true, businessDescription: true, pitchAngle: true,
      targetIndustries: true, targetGeographies: true, targetSizes: true,
      gmailConnected: true, gmailEmail: true,
    },
  })
  return NextResponse.json({ user })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const data = ProfileSchema.parse(body)

    const user = await db.user.update({
      where: { id: session.user.id },
      data,
      select: {
        id: true, name: true, email: true, jobTitle: true, phone: true,
        businessName: true, businessDescription: true, pitchAngle: true,
        targetIndustries: true, targetGeographies: true, targetSizes: true,
        gmailConnected: true, gmailEmail: true,
      },
    })
    return NextResponse.json({ user })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
