import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
import { discoverLeads } from '@/lib/ai'
import { z } from 'zod'

const Schema = z.object({
  industry: z.string().min(1),
  geography: z.string().default('United States'),
  companySize: z.string().default('Mid-market'),
  adActivity: z.string().default('Actively running paid ads'),
  minRevenue: z.string().default('$10M+'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = Schema.parse(body)
    const { leads, webSearched } = await discoverLeads(input)
    return NextResponse.json({ leads, webSearched })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[POST /api/leads/discover]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
