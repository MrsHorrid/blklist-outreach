import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const [leads, emails, activities] = await Promise.all([
      db.lead.findMany({
        select: { id: true, status: true, industry: true, score: true },
      }),
      db.email.findMany({
        select: { status: true, opens: true, sentAt: true, openedAt: true, repliedAt: true },
      }),
      db.activity.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { lead: { select: { company: true, emoji: true } } },
      }),
    ])

    const total = leads.length
    const contacted = leads.filter((l) => l.status !== 'DISCOVERED' && l.status !== 'DISQUALIFIED').length
    const replied = leads.filter((l) => ['REPLIED', 'MEETING', 'CLOSED'].includes(l.status)).length
    const meetings = leads.filter((l) => ['MEETING', 'CLOSED'].includes(l.status)).length
    const closed = leads.filter((l) => l.status === 'CLOSED').length

    const emailsSent = emails.filter((e) => e.status === 'SENT' || e.status === 'OPENED' || e.status === 'REPLIED').length
    const emailsOpened = emails.filter((e) => e.openedAt || e.status === 'OPENED' || e.status === 'REPLIED').length
    const emailsReplied = emails.filter((e) => e.repliedAt || e.status === 'REPLIED').length

    const byStatus = Object.entries(
      leads.reduce((acc, l) => {
        acc[l.status] = (acc[l.status] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    ).map(([status, count]) => ({ status, count }))

    const industryMap: Record<string, { count: number; contacted: number; replied: number; meetings: number }> = {}
    for (const lead of leads) {
      if (!industryMap[lead.industry]) {
        industryMap[lead.industry] = { count: 0, contacted: 0, replied: 0, meetings: 0 }
      }
      industryMap[lead.industry].count++
      if (lead.status !== 'DISCOVERED' && lead.status !== 'DISQUALIFIED') industryMap[lead.industry].contacted++
      if (['REPLIED', 'MEETING', 'CLOSED'].includes(lead.status)) industryMap[lead.industry].replied++
      if (['MEETING', 'CLOSED'].includes(lead.status)) industryMap[lead.industry].meetings++
    }

    const byIndustry = Object.entries(industryMap)
      .map(([industry, d]) => ({
        industry,
        ...d,
        replyRate: d.contacted > 0 ? Math.round((d.replied / d.contacted) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({
      totals: { leads: total, contacted, replied, meetings, closed, emails: emailsSent },
      rates: {
        contactRate: total > 0 ? Math.round((contacted / total) * 100) : 0,
        openRate: emailsSent > 0 ? Math.round((emailsOpened / emailsSent) * 100) : 0,
        replyRate: emailsSent > 0 ? Math.round((emailsReplied / emailsSent) * 100) : 0,
        meetingRate: contacted > 0 ? Math.round((meetings / contacted) * 100) : 0,
      },
      byStatus,
      byIndustry,
      recentActivity: activities,
    })
  } catch (error) {
    console.error('[GET /api/analytics]', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
