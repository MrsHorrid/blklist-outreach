'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'

interface Analytics {
  totals: { leads: number; contacted: number; replied: number; meetings: number; closed: number; emails: number }
  rates: { contactRate: number; openRate: number; replyRate: number; meetingRate: number }
  byIndustry: { industry: string; count: number; contacted: number; replied: number; meetings: number; replyRate: number }[]
  byStatus: { status: string; count: number }[]
  recentActivity: { id: string; type: string; detail?: string; createdAt: string; lead: { company: string; emoji?: string } }[]
}

const STATUS_LABEL: Record<string, string> = {
  DISCOVERED: 'Discovered',
  CONTACTED: 'Contacted',
  OPENED: 'Opened',
  REPLIED: 'Replied',
  MEETING: 'Meeting',
  CLOSED: 'Closed',
  DISQUALIFIED: 'Disqualified',
}

const STATUS_DOT: Record<string, string> = {
  DISCOVERED: 'bg-zinc-400',
  CONTACTED:  'bg-sky-500',
  OPENED:     'bg-amber-500',
  REPLIED:    'bg-violet-500',
  MEETING:    'bg-emerald-500',
  CLOSED:     'bg-emerald-600',
  DISQUALIFIED:'bg-red-400',
}

const ACTIVITY_LABEL: Record<string, string> = {
  LEAD_CREATED: 'Added',
  EMAIL_SENT: 'Sent',
  EMAIL_OPENED: 'Opened',
  EMAIL_REPLIED: 'Replied',
  STATUS_CHANGED: 'Status changed',
  NOTE_ADDED: 'Note',
  MEETING_BOOKED: 'Meeting',
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          className="w-5 h-5 border-2 border-line border-t-ink rounded-full" />
      </div>
    )
  }

  const stats = [
    { label: 'Total leads',  value: data.totals.leads,           sub: 'in your CRM' },
    { label: 'Contacted',    value: data.totals.contacted,       sub: `${data.rates.contactRate}% reach rate` },
    { label: 'Reply rate',   value: `${data.rates.replyRate}%`,  sub: `${data.totals.replied} replied` },
    { label: 'Meetings',     value: data.totals.meetings,        sub: `${data.rates.meetingRate}% conversion` },
    { label: 'Emails sent',  value: data.totals.emails,          sub: `${data.rates.openRate}% open rate` },
    { label: 'Closed',       value: data.totals.closed,          sub: 'won deals' },
  ]

  const max = Math.max(...data.byStatus.map(s => s.count), 1)

  return (
    <div className="max-w-[1180px] mx-auto px-6 sm:px-8 py-10 lg:py-12 space-y-8">
      <motion.header
        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      >
        <h1 className="text-[28px] font-semibold tracking-tighter text-ink">Analytics</h1>
        <p className="text-muted text-[13px] mt-1">Outreach performance and pipeline insights</p>
      </motion.header>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-3 gap-px bg-line rounded-xl overflow-hidden border border-line">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.04 }}
            className="bg-surface px-5 py-5"
          >
            <div className="text-[11.5px] font-medium text-muted tracking-tight">{s.label}</div>
            <div className="text-[26px] font-semibold tracking-tightest text-ink mt-1.5 leading-none tabular-nums">
              {s.value}
            </div>
            <div className="text-[11.5px] text-faint mt-2">{s.sub}</div>
          </motion.div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Funnel */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.3 }}
          className="bg-surface border border-line rounded-xl overflow-hidden"
        >
          <div className="flex items-center px-5 h-12 border-b border-line">
            <h2 className="text-[13px] font-semibold text-ink tracking-tight">Pipeline funnel</h2>
          </div>
          <div className="px-5 py-5 space-y-2.5">
            {data.byStatus.map((item, i) => {
              const pct = Math.round((item.count / max) * 100)
              return (
                <div key={item.status} className="flex items-center gap-3">
                  <div className="w-[88px] flex items-center gap-2 text-[12px] text-muted shrink-0">
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[item.status]}`} />
                    {STATUS_LABEL[item.status]}
                  </div>
                  <div className="flex-1 h-1.5 bg-subtle rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.3 + i * 0.04, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                      className={`h-full rounded-full ${STATUS_DOT[item.status]}`}
                    />
                  </div>
                  <div className="text-[12px] tabular-nums font-medium text-ink w-7 text-right shrink-0">{item.count}</div>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Recent activity */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24, duration: 0.3 }}
          className="bg-surface border border-line rounded-xl overflow-hidden"
        >
          <div className="flex items-center px-5 h-12 border-b border-line">
            <h2 className="text-[13px] font-semibold text-ink tracking-tight">Recent activity</h2>
          </div>
          {data.recentActivity.length === 0 ? (
            <div className="flex items-center justify-center text-faint text-[12.5px] py-12">No activity yet</div>
          ) : (
            <ol className="px-5 py-4 space-y-3.5">
              {data.recentActivity.slice(0, 8).map((act) => (
                <li key={act.id} className="flex items-start gap-2.5">
                  <span className="w-[6px] h-[6px] rounded-full bg-faint mt-[7px] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] text-ink leading-snug">
                      <span className="font-medium">{act.lead.company}</span>
                      <span className="text-muted"> · {ACTIVITY_LABEL[act.type] || act.type.toLowerCase()}</span>
                    </div>
                    {act.detail && <div className="text-[11.5px] text-faint truncate mt-0.5">{act.detail}</div>}
                    <div className="text-[11px] text-faint mt-0.5">
                      {formatDistanceToNow(new Date(act.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </motion.div>
      </div>

      {/* Industry breakdown */}
      {data.byIndustry.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32, duration: 0.3 }}
          className="bg-surface border border-line rounded-xl overflow-hidden"
        >
          <div className="flex items-center px-5 h-12 border-b border-line">
            <h2 className="text-[13px] font-semibold text-ink tracking-tight">Performance by industry</h2>
          </div>
          <table className="w-full text-[13px]">
            <thead>
              <tr>
                <th className="text-left px-5 py-3 text-[10.5px] font-semibold text-faint uppercase tracking-[0.08em]">Industry</th>
                <th className="text-center px-3 py-3 text-[10.5px] font-semibold text-faint uppercase tracking-[0.08em]">Leads</th>
                <th className="text-center px-3 py-3 text-[10.5px] font-semibold text-faint uppercase tracking-[0.08em]">Contacted</th>
                <th className="text-center px-3 py-3 text-[10.5px] font-semibold text-faint uppercase tracking-[0.08em]">Replied</th>
                <th className="text-center px-3 py-3 text-[10.5px] font-semibold text-faint uppercase tracking-[0.08em]">Meetings</th>
                <th className="text-center px-5 py-3 text-[10.5px] font-semibold text-faint uppercase tracking-[0.08em]">Reply rate</th>
              </tr>
            </thead>
            <tbody>
              {data.byIndustry.map((row) => (
                <tr key={row.industry} className="border-t border-line hover:bg-subtle/60">
                  <td className="px-5 py-3 font-medium text-ink">{row.industry}</td>
                  <td className="px-3 py-3 text-center text-muted tabular-nums">{row.count}</td>
                  <td className="px-3 py-3 text-center text-sky-600 tabular-nums">{row.contacted}</td>
                  <td className="px-3 py-3 text-center text-violet-600 tabular-nums">{row.replied}</td>
                  <td className="px-3 py-3 text-center text-emerald-600 tabular-nums">{row.meetings}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`font-semibold tabular-nums ${
                      row.replyRate >= 20 ? 'text-emerald-600' :
                      row.replyRate >= 10 ? 'text-amber-600' : 'text-faint'
                    }`}>
                      {row.replyRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  )
}
