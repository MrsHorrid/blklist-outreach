'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { formatDistanceToNow } from 'date-fns'
import { motion } from 'framer-motion'

interface DashboardData {
  totals: { leads: number; contacted: number; replied: number; meetings: number; emails: number }
  rates: { contactRate: number; openRate: number; replyRate: number }
  byStatus: { status: string; count: number }[]
  recentActivity: { id: string; type: string; detail?: string; createdAt: string; lead: { company: string; emoji?: string } }[]
}

interface RecentLead {
  id: string
  company: string
  domain: string
  emoji?: string
  industry: string
  status: string
  score: number
  updatedAt: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_PILL: Record<string, string> = {
  DISCOVERED: 'bg-gray-100 text-gray-500',
  CONTACTED:  'bg-blue-50 text-blue-600',
  OPENED:     'bg-amber-50 text-amber-600',
  REPLIED:    'bg-violet-50 text-violet-600',
  MEETING:    'bg-green-50 text-green-600',
  CLOSED:     'bg-emerald-50 text-emerald-700',
  DISQUALIFIED:'bg-red-50 text-red-500',
}

const STATUS_BAR: Record<string, string> = {
  DISCOVERED:   'from-gray-300 to-gray-400',
  CONTACTED:    'from-blue-400 to-blue-500',
  OPENED:       'from-amber-400 to-amber-500',
  REPLIED:      'from-violet-400 to-violet-500',
  MEETING:      'from-green-400 to-green-500',
  CLOSED:       'from-emerald-400 to-emerald-500',
  DISQUALIFIED: 'from-red-300 to-red-400',
}

const ACTIVITY_ICON: Record<string, string> = {
  LEAD_CREATED:  '✦',
  EMAIL_SENT:    '↑',
  EMAIL_OPENED:  '◎',
  EMAIL_REPLIED: '↩',
  STATUS_CHANGED:'→',
  NOTE_ADDED:    '✎',
  MEETING_BOOKED:'◈',
  ENRICHED:      '⊕',
  TAG_ADDED:     '⊙',
}

const ACTIVITY_LABEL: Record<string, string> = {
  LEAD_CREATED:  'Lead added',
  EMAIL_SENT:    'Email sent',
  EMAIL_OPENED:  'Email opened',
  EMAIL_REPLIED: 'Replied',
  STATUS_CHANGED:'Status changed',
  NOTE_ADDED:    'Note added',
  MEETING_BOOKED:'Meeting booked',
  ENRICHED:      'Enriched',
  TAG_ADDED:     'Tag added',
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// Animated count-up hook
function useCountUp(target: number) {
  const [count, setCount] = useState(0)
  const prev = useRef(0)
  useEffect(() => {
    if (target === 0) { setCount(0); return }
    const start = prev.current
    const diff = target - start
    const duration = 700
    const steps = 40
    const interval = duration / steps
    let step = 0
    const timer = setInterval(() => {
      step++
      const progress = step / steps
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(start + diff * eased))
      if (step >= steps) { clearInterval(timer); setCount(target); prev.current = target }
    }, interval)
    return () => clearInterval(timer)
  }, [target])
  return count
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({
  label, rawValue, displayValue, sub, icon, colorClass, bgClass, delay,
}: {
  label: string; rawValue: number; displayValue?: string; sub: string
  icon: React.ReactNode; colorClass: string; bgClass: string; delay: number
}) {
  const animated = useCountUp(rawValue)
  const shown = displayValue ?? animated.toString()

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
      whileHover={{ y: -2, boxShadow: '0 8px 28px rgba(0,0,0,0.08)' }}
      className="bg-white rounded-2xl border border-gray-200/70 p-5 flex flex-col gap-3 shadow-sm cursor-default"
    >
      <div className={`w-9 h-9 rounded-xl ${bgClass} flex items-center justify-center`}>
        <span className={colorClass}>{icon}</span>
      </div>
      <div>
        <div className={`text-3xl font-bold tracking-tight ${colorClass}`}>{shown}</div>
        <div className="text-xs font-semibold text-gray-500 mt-0.5">{label}</div>
        <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>
      </div>
    </motion.div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: session } = useSession()
  const [analytics, setAnalytics] = useState<DashboardData | null>(null)
  const [leads, setLeads] = useState<RecentLead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/analytics').then(r => r.json()),
      fetch('/api/leads?limit=5&sortBy=createdAt&sortDir=desc').then(r => r.json()),
    ]).then(([ana, lds]) => {
      setAnalytics(ana)
      setLeads(lds.leads || [])
      setLoading(false)
    })
  }, [])

  const firstName = session?.user?.name?.split(' ')[0] || 'there'
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  const pipelineStages = ['DISCOVERED', 'CONTACTED', 'OPENED', 'REPLIED', 'MEETING', 'CLOSED']
  const maxCount = Math.max(...(analytics?.byStatus.map(s => s.count) ?? [1]), 1)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-500 rounded-full"
        />
      </div>
    )
  }

  const t = analytics?.totals
  const r = analytics?.rates

  const stats = [
    {
      label: 'Total Leads',
      rawValue: t?.leads ?? 0,
      sub: `${t?.leads === 1 ? '1 lead' : `${t?.leads ?? 0} leads`} in CRM`,
      icon: <IconUsers />,
      colorClass: 'text-gray-700',
      bgClass: 'bg-gray-100',
    },
    {
      label: 'Contacted',
      rawValue: t?.contacted ?? 0,
      sub: `${r?.contactRate ?? 0}% reach rate`,
      icon: <IconMail />,
      colorClass: 'text-blue-600',
      bgClass: 'bg-blue-50',
    },
    {
      label: 'Open Rate',
      rawValue: r?.openRate ?? 0,
      displayValue: `${r?.openRate ?? 0}%`,
      sub: `${t?.emails ?? 0} emails sent`,
      icon: <IconOpen />,
      colorClass: 'text-violet-600',
      bgClass: 'bg-violet-50',
    },
    {
      label: 'Reply Rate',
      rawValue: r?.replyRate ?? 0,
      displayValue: `${r?.replyRate ?? 0}%`,
      sub: `${t?.replied ?? 0} replied`,
      icon: <IconReply />,
      colorClass: 'text-emerald-600',
      bgClass: 'bg-emerald-50',
    },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">

      {/* ── Hero ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-2xl bg-[#0a0a14] p-6 sm:p-8 text-white"
      >
        {/* Glow layers */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 w-48 h-48 rounded-full bg-violet-600/15 blur-3xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <p className="text-white/40 text-xs font-medium tracking-wide mb-1">{today}</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {greeting()}, {firstName} 👋
            </h1>
            <p className="text-white/40 text-sm mt-2">
              {(t?.leads ?? 0) === 0
                ? 'Start by discovering your first leads.'
                : `${t?.leads} lead${t?.leads === 1 ? '' : 's'} · ${t?.contacted} contacted · ${t?.replied} replied`}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link
              href="/leads/discover"
              className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-500/25"
            >
              ✦ Discover
            </Link>
            <Link
              href="/leads"
              className="px-4 py-2.5 bg-white/8 hover:bg-white/14 border border-white/10 text-white text-sm font-medium rounded-xl transition-colors"
            >
              View Leads
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s, i) => (
          <StatCard key={s.label} {...s} delay={0.05 + i * 0.06} />
        ))}
      </div>

      {/* ── Middle row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent Leads */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.35 }}
          className="lg:col-span-2 bg-white rounded-2xl border border-gray-200/70 overflow-hidden shadow-sm"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Recent Leads</h2>
            <Link href="/leads" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
              View all →
            </Link>
          </div>

          {leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center px-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-3">
                <span className="text-xl">◈</span>
              </div>
              <p className="text-sm font-semibold text-gray-700">No leads yet</p>
              <p className="text-xs text-gray-400 mt-1 mb-5">Discover companies with AI or add one manually.</p>
              <Link
                href="/leads/discover"
                className="px-4 py-2 bg-indigo-600 text-white text-xs rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
              >
                ✦ Discover Leads
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {leads.map((lead, i) => (
                <motion.div
                  key={lead.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.04 }}
                >
                  <Link
                    href="/leads"
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/80 transition-colors group"
                  >
                    <span className="text-xl shrink-0 w-8 text-center">{lead.emoji || '🏢'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-900 group-hover:text-indigo-700 transition-colors truncate">
                        {lead.company}
                      </div>
                      <div className="text-xs text-gray-400 truncate">{lead.industry}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`hidden sm:inline px-2.5 py-0.5 text-[11px] rounded-full font-medium ${STATUS_PILL[lead.status] || 'bg-gray-100 text-gray-500'}`}>
                        {lead.status.charAt(0) + lead.status.slice(1).toLowerCase()}
                      </span>
                      <span className="text-[11px] text-gray-300">
                        {formatDistanceToNow(new Date(lead.updatedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Activity feed */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.35 }}
          className="bg-white rounded-2xl border border-gray-200/70 overflow-hidden shadow-sm"
        >
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Activity</h2>
          </div>

          {!analytics?.recentActivity?.length ? (
            <div className="flex items-center justify-center py-12 text-gray-300 text-sm">
              No activity yet
            </div>
          ) : (
            <div className="px-5 py-4 space-y-4 overflow-y-auto max-h-[340px]">
              {analytics.recentActivity.slice(0, 10).map((act, i) => (
                <motion.div
                  key={act.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.03 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-6 h-6 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] text-gray-400">{ACTIVITY_ICON[act.type] || '·'}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-gray-700 leading-snug">
                      <span className="font-semibold">{act.lead.company}</span>
                      <span className="text-gray-400"> — {ACTIVITY_LABEL[act.type] || act.type}</span>
                    </div>
                    {act.detail && <div className="text-[11px] text-gray-300 truncate mt-0.5">{act.detail}</div>}
                    <div className="text-[10px] text-gray-300 mt-0.5">
                      {formatDistanceToNow(new Date(act.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Pipeline snapshot ── */}
      {(t?.leads ?? 0) > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.35 }}
          className="bg-white rounded-2xl border border-gray-200/70 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900 text-sm">Pipeline</h2>
            <Link href="/pipeline" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
              Open Pipeline →
            </Link>
          </div>
          <div className="space-y-3">
            {pipelineStages.map((stage, i) => {
              const found = analytics?.byStatus.find(s => s.status === stage)
              const count = found?.count ?? 0
              const pct = Math.round((count / maxCount) * 100)
              return (
                <motion.div
                  key={stage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 + i * 0.04 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-20 text-[11px] text-gray-400 font-medium text-right shrink-0">
                    {stage.charAt(0) + stage.slice(1).toLowerCase()}
                  </div>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.45 + i * 0.04, duration: 0.5, ease: 'easeOut' }}
                      className={`h-full rounded-full bg-gradient-to-r ${STATUS_BAR[stage]}`}
                    />
                  </div>
                  <div className="text-xs font-semibold text-gray-500 w-6 text-right shrink-0">{count}</div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      )}
    </div>
  )
}

// ── Stat icons ─────────────────────────────────────────────────────────────────

function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="4" />
      <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
      <path d="M19 8v6M16 11h6" />
    </svg>
  )
}

function IconMail() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 7l10 7 10-7" />
    </svg>
  )
}

function IconOpen() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function IconReply() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 17 4 12 9 7" />
      <path d="M20 18v-2a4 4 0 00-4-4H4" />
    </svg>
  )
}
