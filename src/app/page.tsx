'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
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

const STATUS_BAR: Record<string, string> = {
  DISCOVERED:   'bg-zinc-400',
  CONTACTED:    'bg-sky-500',
  OPENED:       'bg-amber-500',
  REPLIED:      'bg-violet-500',
  MEETING:      'bg-emerald-500',
  CLOSED:       'bg-emerald-600',
  DISQUALIFIED: 'bg-red-400',
}

const ACTIVITY_LABEL: Record<string, string> = {
  LEAD_CREATED: 'Added',
  EMAIL_SENT: 'Sent',
  EMAIL_OPENED: 'Opened',
  EMAIL_REPLIED: 'Replied',
  STATUS_CHANGED: 'Status changed',
  NOTE_ADDED: 'Note',
  MEETING_BOOKED: 'Meeting',
  ENRICHED: 'Enriched',
  TAG_ADDED: 'Tag added',
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// Count-up hook with eased easing
function useCountUp(target: number, durationMs = 700) {
  const [val, setVal] = useState(0)
  const prev = useRef(0)
  useEffect(() => {
    if (target === 0) { setVal(0); return }
    const start = prev.current
    const diff = target - start
    const t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / durationMs)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(start + diff * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
      else prev.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs])
  return val
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [analytics, setAnalytics] = useState<DashboardData | null>(null)
  const [leads, setLeads] = useState<RecentLead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check onboarding status, then load data (or redirect)
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(({ user }) => {
        if (user && !user.onboardingCompleted) {
          router.replace('/onboarding')
          return Promise.reject('redirecting')
        }
        return Promise.all([
          fetch('/api/analytics').then(r => r.json()),
          fetch('/api/leads?limit=6&sortBy=createdAt&sortDir=desc').then(r => r.json()),
        ])
      })
      .then((res) => {
        if (!res) return
        const [a, l] = res
        setAnalytics(a)
        setLeads(l.leads || [])
        setLoading(false)
      })
      .catch(() => { /* redirecting or failed */ })
  }, [router])

  const firstName = session?.user?.name?.split(' ')[0] || 'there'
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    )
  }

  const t = analytics?.totals
  const r = analytics?.rates

  const stats: StatProps[] = [
    { label: 'Total leads',   raw: t?.leads ?? 0,                                                        sub: 'in your CRM' },
    { label: 'Contacted',     raw: t?.contacted ?? 0,           hint: r?.contactRate != null ? `${r.contactRate}%` : undefined,           sub: 'reached out' },
    { label: 'Open rate',     raw: r?.openRate ?? 0, format: 'pct', sub: `${t?.emails ?? 0} sent` },
    { label: 'Reply rate',    raw: r?.replyRate ?? 0, format: 'pct', sub: `${t?.replied ?? 0} replied` },
  ]

  const pipelineStages = ['DISCOVERED', 'CONTACTED', 'OPENED', 'REPLIED', 'MEETING', 'CLOSED']
  const maxCount = Math.max(...(analytics?.byStatus.map(s => s.count) ?? [1]), 1)

  return (
    <div className="max-w-[1180px] mx-auto px-6 sm:px-8 py-8 lg:py-12 space-y-10">

      {/* ── Header ── */}
      <motion.header
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-end justify-between flex-wrap gap-4"
      >
        <div>
          <p className="text-faint text-[12px] font-medium tracking-tight">{today}</p>
          <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-tighter text-ink mt-1">
            {greeting()}, {firstName}
          </h1>
          <p className="text-muted text-[14px] mt-1">
            {(t?.leads ?? 0) === 0
              ? 'Start by discovering your first leads.'
              : `${t?.leads} leads · ${t?.contacted} contacted · ${t?.replied} replied`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/leads"
            className="h-9 px-3.5 inline-flex items-center text-[13px] font-medium text-ink bg-surface border border-line rounded-lg hover:bg-subtle"
          >
            View leads
          </Link>
          <Link
            href="/leads/discover"
            className="h-9 px-3.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-white bg-ink rounded-lg hover:bg-zinc-800"
          >
            <SparkIcon /> Discover
          </Link>
        </div>
      </motion.header>

      {/* ── Stats ── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-line rounded-xl overflow-hidden border border-line">
        {stats.map((s, i) => <StatCard key={s.label} {...s} delay={0.05 + i * 0.04} />)}
      </section>

      {/* ── Recent leads + Activity ── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Recent leads */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-2 bg-surface rounded-xl border border-line overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 h-12 border-b border-line">
            <h2 className="text-[13px] font-semibold text-ink tracking-tight">Recent leads</h2>
            <Link href="/leads" className="text-[12px] text-muted hover:text-ink font-medium">
              All leads <span className="ml-1">→</span>
            </Link>
          </div>

          {leads.length === 0 ? (
            <EmptyState />
          ) : (
            <ul>
              {leads.map((lead, i) => (
                <motion.li
                  key={lead.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.22 + i * 0.03 }}
                  className="border-b border-line last:border-b-0"
                >
                  <Link
                    href="/leads"
                    className="flex items-center gap-3 px-5 h-[52px] hover:bg-subtle group"
                  >
                    <span className="text-lg shrink-0 w-7 h-7 flex items-center justify-center bg-subtle rounded-md group-hover:bg-white border border-line">
                      {lead.emoji || '🏢'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-ink truncate">{lead.company}</div>
                      <div className="text-[11.5px] text-faint truncate">{lead.industry}</div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 shrink-0">
                      <StatusPill status={lead.status} />
                    </div>
                    <div className="text-[11px] text-faint shrink-0 hidden md:block w-20 text-right">
                      {formatDistanceToNow(new Date(lead.updatedAt), { addSuffix: true })}
                    </div>
                  </Link>
                </motion.li>
              ))}
            </ul>
          )}
        </motion.div>

        {/* Activity */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="bg-surface rounded-xl border border-line overflow-hidden flex flex-col"
        >
          <div className="flex items-center px-5 h-12 border-b border-line">
            <h2 className="text-[13px] font-semibold text-ink tracking-tight">Activity</h2>
          </div>

          {!analytics?.recentActivity?.length ? (
            <div className="flex-1 flex items-center justify-center text-faint text-[12.5px] py-12">
              No activity yet
            </div>
          ) : (
            <ol className="px-5 py-4 space-y-3.5 overflow-y-auto max-h-[360px]">
              {analytics.recentActivity.slice(0, 10).map((act, i) => (
                <motion.li
                  key={act.id}
                  initial={{ opacity: 0, x: -3 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.26 + i * 0.025 }}
                  className="flex items-start gap-2.5"
                >
                  <span className="w-[6px] h-[6px] rounded-full bg-faint mt-[7px] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] text-ink leading-snug">
                      <span className="font-medium">{act.lead.company}</span>
                      <span className="text-muted"> · {ACTIVITY_LABEL[act.type] || act.type.toLowerCase()}</span>
                    </div>
                    <div className="text-[11px] text-faint mt-0.5">
                      {formatDistanceToNow(new Date(act.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                </motion.li>
              ))}
            </ol>
          )}
        </motion.div>
      </section>

      {/* ── Pipeline ── */}
      {(t?.leads ?? 0) > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="bg-surface rounded-xl border border-line overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 h-12 border-b border-line">
            <h2 className="text-[13px] font-semibold text-ink tracking-tight">Pipeline</h2>
            <Link href="/pipeline" className="text-[12px] text-muted hover:text-ink font-medium">
              Open board <span className="ml-1">→</span>
            </Link>
          </div>
          <div className="px-5 py-5 space-y-2.5">
            {pipelineStages.map((stage, i) => {
              const found = analytics?.byStatus.find(s => s.status === stage)
              const count = found?.count ?? 0
              const pct = Math.round((count / maxCount) * 100)
              return (
                <div key={stage} className="flex items-center gap-3">
                  <div className="w-[88px] flex items-center gap-2 text-[12px] text-muted shrink-0">
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[stage]}`} />
                    {STATUS_LABEL[stage]}
                  </div>
                  <div className="flex-1 h-1.5 bg-subtle rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.35 + i * 0.04, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                      className={`h-full rounded-full ${STATUS_BAR[stage]}`}
                    />
                  </div>
                  <div className="text-[12px] tabular-nums font-medium text-ink w-7 text-right shrink-0">
                    {count}
                  </div>
                </div>
              )
            })}
          </div>
        </motion.section>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface StatProps {
  label: string
  raw: number
  format?: 'pct'
  hint?: string
  sub: string
}

function StatCard({ label, raw, format, sub, delay }: StatProps & { delay: number }) {
  const animated = useCountUp(raw)
  const display = format === 'pct' ? `${animated}%` : animated.toString()

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="bg-surface px-5 py-5 hover:bg-subtle/40 cursor-default"
    >
      <div className="text-[11.5px] font-medium text-muted tracking-tight">{label}</div>
      <div className="text-[28px] font-semibold tracking-tightest text-ink tabular-nums mt-1.5 leading-none">
        {display}
      </div>
      <div className="text-[11.5px] text-faint mt-2">{sub}</div>
    </motion.div>
  )
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 h-[22px] text-[11px] font-medium text-muted bg-subtle rounded-md">
      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status]}`} />
      {STATUS_LABEL[status]}
    </span>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      <div className="w-10 h-10 rounded-xl bg-subtle border border-line flex items-center justify-center mb-3">
        <SparkIcon className="w-4 h-4 text-faint" />
      </div>
      <p className="text-[13px] font-medium text-ink">No leads yet</p>
      <p className="text-[12px] text-faint mt-1 mb-4 max-w-[260px]">
        Discover companies with AI or add one manually.
      </p>
      <Link
        href="/leads/discover"
        className="h-8 px-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-white bg-ink rounded-md hover:bg-zinc-800"
      >
        <SparkIcon /> Discover leads
      </Link>
    </div>
  )
}

function Spinner() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      className="w-5 h-5 border-2 border-line border-t-ink rounded-full"
    />
  )
}

function SparkIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z" />
    </svg>
  )
}
