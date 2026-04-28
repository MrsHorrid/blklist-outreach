'use client'

import { useState, useEffect } from 'react'

interface Analytics {
  totals: {
    leads: number
    contacted: number
    replied: number
    meetings: number
    closed: number
    emails: number
  }
  rates: {
    contactRate: number
    openRate: number
    replyRate: number
    meetingRate: number
  }
  byIndustry: {
    industry: string
    count: number
    contacted: number
    replied: number
    meetings: number
    replyRate: number
  }[]
  byStatus: { status: string; count: number }[]
  recentActivity: {
    id: string
    type: string
    detail?: string
    createdAt: string
    lead: { company: string; emoji?: string }
  }[]
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
  }, [])

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    )
  }

  const stats = [
    { label: 'Total Leads', value: data.totals.leads, sub: 'in CRM', color: 'text-gray-900' },
    { label: 'Contacted', value: data.totals.contacted, sub: `${data.rates.contactRate}% of leads`, color: 'text-blue-600' },
    { label: 'Reply Rate', value: `${data.rates.replyRate}%`, sub: `${data.totals.replied} replied`, color: 'text-violet-600' },
    { label: 'Meetings', value: data.totals.meetings, sub: `${data.rates.meetingRate}% conversion`, color: 'text-green-600' },
    { label: 'Emails Sent', value: data.totals.emails, sub: `${data.rates.openRate}% open rate`, color: 'text-indigo-600' },
    { label: 'Closed', value: data.totals.closed, sub: 'won deals', color: 'text-emerald-600' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">Outreach performance and pipeline insights</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{s.label}</div>
            <div className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-400 mt-1">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Pipeline funnel */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Pipeline Funnel</h2>
          <div className="space-y-2">
            {data.byStatus.map((item) => {
              const pct = data.totals.leads ? Math.round((item.count / data.totals.leads) * 100) : 0
              const statusColors: Record<string, string> = {
                DISCOVERED: 'bg-gray-400',
                CONTACTED: 'bg-blue-400',
                OPENED: 'bg-amber-400',
                REPLIED: 'bg-violet-400',
                MEETING: 'bg-green-400',
                CLOSED: 'bg-emerald-400',
                DISQUALIFIED: 'bg-red-300',
              }
              return (
                <div key={item.status} className="flex items-center gap-3">
                  <div className="w-24 text-xs text-gray-500 text-right shrink-0">
                    {item.status.charAt(0) + item.status.slice(1).toLowerCase()}
                  </div>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${statusColors[item.status] || 'bg-gray-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-xs font-medium text-gray-700 w-8 text-right">{item.count}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Recent Activity</h2>
          {data.recentActivity.length === 0 ? (
            <p className="text-sm text-gray-400">No activity yet.</p>
          ) : (
            <div className="space-y-3">
              {data.recentActivity.slice(0, 8).map((act) => (
                <div key={act.id} className="flex items-start gap-2.5">
                  <span className="text-sm mt-0.5">{act.lead.emoji || '🏢'}</span>
                  <div className="min-w-0">
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">{act.lead.company}</span>
                      {' — '}{ACTIVITY_LABEL[act.type] || act.type}
                    </div>
                    {act.detail && <div className="text-xs text-gray-400 truncate">{act.detail}</div>}
                    <div className="text-xs text-gray-300 mt-0.5">
                      {new Date(act.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Industry breakdown */}
      {data.byIndustry.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Performance by Industry</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Industry</th>
                <th className="pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide text-center">Leads</th>
                <th className="pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide text-center">Contacted</th>
                <th className="pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide text-center">Replied</th>
                <th className="pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide text-center">Meetings</th>
                <th className="pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide text-center">Reply Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.byIndustry.map((row) => (
                <tr key={row.industry} className="hover:bg-gray-50/50">
                  <td className="py-2.5 font-medium text-gray-800">{row.industry}</td>
                  <td className="py-2.5 text-center text-gray-600">{row.count}</td>
                  <td className="py-2.5 text-center text-blue-600">{row.contacted}</td>
                  <td className="py-2.5 text-center text-violet-600">{row.replied}</td>
                  <td className="py-2.5 text-center text-green-600">{row.meetings}</td>
                  <td className="py-2.5 text-center">
                    <span className={`font-semibold ${
                      row.replyRate >= 20 ? 'text-green-600' :
                      row.replyRate >= 10 ? 'text-amber-600' : 'text-gray-500'
                    }`}>
                      {row.replyRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* BLKLIST positioning reminder */}
      <div className="mt-6 bg-indigo-50 border border-indigo-100 rounded-xl p-5">
        <h3 className="font-semibold text-indigo-800 text-sm mb-2">BLKLIST Value Proposition</h3>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: '30%+ CTR', sub: 'Native in-feed' },
            { label: '$350K', sub: 'Google backed' },
            { label: 'Lumen', sub: 'Attention verified' },
            { label: 'NYT, Bloomberg', sub: '500+ publishers' },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <div className="font-bold text-indigo-700">{item.label}</div>
              <div className="text-xs text-indigo-400 mt-0.5">{item.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const ACTIVITY_LABEL: Record<string, string> = {
  LEAD_CREATED: 'Lead added',
  EMAIL_SENT: 'Email sent',
  EMAIL_OPENED: 'Email opened',
  EMAIL_REPLIED: 'Replied',
  STATUS_CHANGED: 'Status changed',
  NOTE_ADDED: 'Note added',
  MEETING_BOOKED: 'Meeting booked',
}
