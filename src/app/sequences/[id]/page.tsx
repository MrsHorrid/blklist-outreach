'use client'

import { useState, useEffect, use } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { useRouter } from 'next/navigation'

interface Step {
  id: string
  order: number
  subject: string
  body: string
  delayDays: number
  tone: string
}

interface Enrollment {
  id: string
  status: string
  currentStep: number
  nextSendAt: string | null
  enrolledAt: string
  lead: { id: string; company: string; emoji: string | null; contactName: string | null; contactEmail: string | null }
}

interface Analytics {
  totalEnrolled: number
  byStatus: Record<string, number>
  emailsSent: number
  emailsOpened: number
  emailsReplied: number
  openRate: number
  replyRate: number
  stepCount: number
  timeline: Record<string, number>
}

type Tab = 'builder' | 'enrolled' | 'analytics'

const TONES = [
  { value: 'confident', label: 'Confident' },
  { value: 'premium', label: 'Premium' },
  { value: 'casual', label: 'Casual' },
  { value: 'urgent', label: 'Urgent' },
]

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  PAUSED: 'bg-amber-500/10 text-amber-600',
  COMPLETED: 'bg-emerald-500/10 text-emerald-600',
  REPLIED: 'bg-violet-500/10 text-violet-600',
  BOUNCED: 'bg-red-500/10 text-red-500',
  UNSUBSCRIBED: 'bg-zinc-500/10 text-zinc-500',
}

export default function SequenceBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [name, setName] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [steps, setSteps] = useState<Step[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [tab, setTab] = useState<Tab>('builder')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [processResult, setProcessResult] = useState<{ processed: number; completed: number } | null>(null)
  const [generatingStep, setGeneratingStep] = useState<string | null>(null)
  const [editingName, setEditingName] = useState(false)

  const load = async () => {
    const [seqRes, enrollRes] = await Promise.all([
      fetch(`/api/sequences/${id}`),
      fetch(`/api/sequences/${id}/analytics`),
    ])
    const { sequence } = await seqRes.json()
    const analyticsData = await enrollRes.json()

    if (!sequence) { router.push('/sequences'); return }
    setName(sequence.name)
    setIsActive(sequence.isActive)
    setSteps(sequence.steps || [])
    setAnalytics(analyticsData)
    setLoading(false)
  }

  const loadEnrollments = async () => {
    // Re-use analytics endpoint data + a dedicated enrollments fetch if needed
    const res = await fetch(`/api/sequences/${id}`)
    // For simplicity we'll fetch enrollments via the sequence route
    // In a full impl we'd have a dedicated endpoint; this is close enough
    setLoading(false)
  }

  useEffect(() => { load() }, [id])
  useEffect(() => {
    if (tab === 'enrolled') {
      fetch(`/api/sequences/${id}`).then(r => r.json()).then(({ sequence }) => {
        // We'll use a different approach: embedded enrollments in the sequence
      })
      // Fetch enrollments from a dedicated route
      fetch(`/api/sequences/${id}/enrollments`).then(r => r.json()).then(data => {
        if (data.enrollments) setEnrollments(data.enrollments)
      }).catch(() => {})
    }
    if (tab === 'analytics') {
      fetch(`/api/sequences/${id}/analytics`).then(r => r.json()).then(setAnalytics)
    }
  }, [tab, id])

  const saveName = async () => {
    setEditingName(false)
    await fetch(`/api/sequences/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
  }

  const toggleActive = async () => {
    const next = !isActive
    setIsActive(next)
    await fetch(`/api/sequences/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: next }),
    })
  }

  const addStep = async () => {
    const stepNum = steps.length
    const defaults = [
      { subject: `quick chat about {{company}}, {{firstName}}?`, delayDays: 0 },
      { subject: `following up — {{company}}`, delayDays: 3 },
      { subject: `last note — {{company}}`, delayDays: 5 },
    ]
    const d = defaults[Math.min(stepNum, defaults.length - 1)]

    const body_text = stepNum === 0
      ? `Hi {{firstName}},\n\nI came across {{company}} and thought there could be a great fit here.\n\nWould love to share a quick idea — open for a 15-min chat?\n\nBest,`
      : stepNum === 1
      ? `Hi {{firstName}},\n\nJust wanted to follow up on my last note about {{company}}.\n\nStill think there's something worth exploring. Would this week work for a quick call?\n\nBest,`
      : `Hi {{firstName}},\n\nI'll keep this short — last outreach from me. If timing ever works for {{company}}, I'd love to connect.\n\nBest,`

    const res = await fetch(`/api/sequences/${id}/steps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: d.subject, body: body_text, delayDays: d.delayDays, tone: 'confident' }),
    })
    const { step } = await res.json()
    setSteps(s => [...s, step])
  }

  const updateStepField = (stepId: string, field: keyof Step, value: string | number) => {
    setSteps(s => s.map(step => step.id === stepId ? { ...step, [field]: value } : step))
  }

  const saveStep = async (step: Step) => {
    setSaving(true)
    await fetch(`/api/sequences/${id}/steps/${step.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: step.subject, body: step.body, delayDays: step.delayDays, tone: step.tone }),
    })
    setSaving(false)
  }

  const deleteStep = async (stepId: string) => {
    await fetch(`/api/sequences/${id}/steps/${stepId}`, { method: 'DELETE' })
    setSteps(s => s.filter(step => step.id !== stepId).map((step, i) => ({ ...step, order: i })))
  }

  const onReorder = async (newSteps: Step[]) => {
    const reordered = newSteps.map((step, i) => ({ ...step, order: i }))
    setSteps(reordered)
    await fetch(`/api/sequences/${id}/steps`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reordered.map(s => ({ id: s.id, order: s.order }))),
    })
  }

  const generateAI = async (step: Step) => {
    setGeneratingStep(step.id)
    try {
      const res = await fetch('/api/ai/generate-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepNumber: step.order, tone: step.tone, sequenceName: name }),
      })
      if (res.ok) {
        const { subject, body } = await res.json()
        const updated = { ...step, subject, body }
        setSteps(s => s.map(s2 => s2.id === step.id ? updated : s2))
        await saveStep(updated)
      }
    } finally {
      setGeneratingStep(null)
    }
  }

  const processQueue = async () => {
    setProcessing(true)
    const res = await fetch('/api/sequences/process', { method: 'POST' })
    const data = await res.json()
    setProcessResult(data)
    setProcessing(false)
    load()
  }

  // Cumulative day offset for display
  const cumulativeDay = (stepIndex: number) =>
    steps.slice(0, stepIndex + 1).reduce((acc, s) => acc + s.delayDays, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          className="w-5 h-5 border-2 border-line border-t-ink rounded-full" />
      </div>
    )
  }

  return (
    <div className="max-w-[900px] mx-auto px-6 sm:px-8 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button onClick={() => router.push('/sequences')} className="text-muted hover:text-ink text-[13px] transition-colors">← Sequences</button>
        <span className="text-line">/</span>
        {editingName ? (
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={e => e.key === 'Enter' && saveName()}
            className="text-[18px] font-semibold text-ink bg-transparent border-b border-accent outline-none"
          />
        ) : (
          <h1 onClick={() => setEditingName(true)} className="text-[18px] font-semibold text-ink cursor-text hover:opacity-80 truncate">
            {name}
          </h1>
        )}
        <div className="ml-auto flex items-center gap-3">
          {saving && <span className="text-[11px] text-muted">Saving…</span>}
          <button
            onClick={toggleActive}
            className={`flex items-center gap-2 h-8 px-3 rounded-lg text-[12px] font-medium transition-colors ${
              isActive ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' : 'bg-subtle text-muted hover:bg-line'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-muted'}`} />
            {isActive ? 'Active' : 'Paused'}
          </button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={processQueue}
            disabled={processing}
            className="h-8 px-4 bg-ink text-white dark:text-black text-[12px] font-semibold rounded-lg disabled:opacity-50"
          >
            {processing ? 'Processing…' : '▶ Process queue'}
          </motion.button>
        </div>
      </div>

      {processResult && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[12px] text-emerald-600">
          Processed {processResult.processed} email{processResult.processed !== 1 ? 's' : ''} — {processResult.completed} sequence{processResult.completed !== 1 ? 's' : ''} completed.
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-subtle rounded-xl p-1 w-fit">
        {(['builder', 'enrolled', 'analytics'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-[13px] font-medium rounded-lg capitalize transition-colors ${
              tab === t ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            {t}
            {t === 'enrolled' && analytics && analytics.totalEnrolled > 0 && (
              <span className="ml-1.5 text-[10px] bg-accent/15 text-accent px-1.5 py-0.5 rounded-full">{analytics.totalEnrolled}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Builder ── */}
      {tab === 'builder' && (
        <div>
          {steps.length === 0 && (
            <div className="text-center py-12 bg-surface border border-line rounded-2xl mb-4">
              <div className="text-[28px] mb-2">✉</div>
              <p className="text-[13px] text-muted mb-4">Add your first email step to get started.</p>
            </div>
          )}

          <Reorder.Group axis="y" values={steps} onReorder={onReorder} className="space-y-3">
            {steps.map((step, i) => (
              <Reorder.Item key={step.id} value={step}>
                <StepCard
                  step={step}
                  index={i}
                  dayOffset={cumulativeDay(i)}
                  isFirst={i === 0}
                  generating={generatingStep === step.id}
                  onChange={(field, val) => updateStepField(step.id, field, val)}
                  onSave={() => saveStep(step)}
                  onDelete={() => deleteStep(step.id)}
                  onGenerate={() => generateAI(step)}
                />
              </Reorder.Item>
            ))}
          </Reorder.Group>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={addStep}
            className="mt-4 w-full py-3 border-2 border-dashed border-line rounded-xl text-[13px] text-muted hover:border-accent hover:text-accent transition-colors font-medium"
          >
            + Add step
          </motion.button>
        </div>
      )}

      {/* ── Enrolled ── */}
      {tab === 'enrolled' && (
        <EnrolledTab enrollments={enrollments} stepCount={steps.length} />
      )}

      {/* ── Analytics ── */}
      {tab === 'analytics' && analytics && (
        <AnalyticsTab analytics={analytics} />
      )}
    </div>
  )
}

// ── Step Card ─────────────────────────────────────────────────────────────────

function StepCard({
  step, index, dayOffset, isFirst, generating, onChange, onSave, onDelete, onGenerate,
}: {
  step: Step; index: number; dayOffset: number; isFirst: boolean
  generating: boolean
  onChange: (field: keyof Step, val: string | number) => void
  onSave: () => void; onDelete: () => void; onGenerate: () => void
}) {
  const [expanded, setExpanded] = useState(true)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface border border-line rounded-2xl overflow-hidden"
    >
      {/* Step header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-line cursor-grab active:cursor-grabbing">
        <span className="text-faint text-[16px] select-none">⠿</span>
        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
          isFirst ? 'bg-accent text-white' : 'bg-subtle text-ink'
        }`}>
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[12px] font-semibold text-muted">
            {isFirst ? 'Day 0 — First touch' : `Day ${dayOffset} — Follow-up ${index}`}
          </span>
          {!expanded && <p className="text-[12px] text-faint truncate mt-0.5">{step.subject}</p>}
        </div>
        <button onClick={onDelete} className="text-faint hover:text-red-500 text-[13px] px-1 transition-colors">✕</button>
        <button onClick={() => setExpanded(e => !e)} className="text-muted text-[12px] px-2 hover:text-ink">
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {/* Step body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 py-4 space-y-3">
              {/* Delay */}
              {!isFirst && (
                <div className="flex items-center gap-2">
                  <label className="text-[11.5px] text-muted font-medium w-24">Send after</label>
                  <input
                    type="number"
                    min={1} max={365}
                    value={step.delayDays}
                    onChange={e => onChange('delayDays', parseInt(e.target.value) || 1)}
                    onBlur={onSave}
                    className="w-16 text-[13px] border border-line rounded-lg px-2.5 h-8 bg-canvas text-ink text-center"
                  />
                  <span className="text-[12px] text-muted">days</span>
                </div>
              )}

              {/* Tone + AI generate */}
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-[11.5px] text-muted font-medium w-24">Tone</label>
                <div className="flex gap-1">
                  {TONES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => { onChange('tone', t.value); onSave() }}
                      className={`h-7 px-2.5 text-[11px] rounded-lg font-medium transition-colors ${
                        step.tone === t.value ? 'bg-accent text-white' : 'bg-subtle text-muted hover:bg-line'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={onGenerate}
                  disabled={generating}
                  className="ml-auto h-7 px-3 text-[11px] font-semibold bg-accent/10 text-accent rounded-lg hover:bg-accent/20 disabled:opacity-50 transition-colors"
                >
                  {generating ? '⟳ Generating…' : '✦ AI draft'}
                </motion.button>
              </div>

              {/* Subject */}
              <div>
                <label className="text-[11.5px] text-muted font-medium block mb-1">Subject</label>
                <input
                  type="text"
                  value={step.subject}
                  onChange={e => onChange('subject', e.target.value)}
                  onBlur={onSave}
                  placeholder="quick chat about {{company}}, {{firstName}}?"
                  className="w-full text-[13px] border border-line rounded-lg px-3.5 h-9 bg-canvas text-ink focus:border-accent focus:ring-2 focus:ring-accent/15"
                />
              </div>

              {/* Body */}
              <div>
                <label className="text-[11.5px] text-muted font-medium block mb-1">Body</label>
                <textarea
                  value={step.body}
                  onChange={e => onChange('body', e.target.value)}
                  onBlur={onSave}
                  rows={6}
                  placeholder="Hi {{firstName}},&#10;&#10;..."
                  className="w-full text-[13px] border border-line rounded-lg px-3.5 py-2.5 bg-canvas text-ink focus:border-accent focus:ring-2 focus:ring-accent/15 resize-none font-mono"
                />
                <p className="text-[11px] text-faint mt-1">Tokens: {'{{firstName}}'} {'{{company}}'} {'{{industry}}'} {'{{contactName}}'}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Enrolled Tab ──────────────────────────────────────────────────────────────

function EnrolledTab({ enrollments, stepCount }: { enrollments: Enrollment[]; stepCount: number }) {
  if (enrollments.length === 0) {
    return (
      <div className="text-center py-12 bg-surface border border-line rounded-2xl">
        <p className="text-[13px] text-muted">No leads enrolled yet. Go to Leads and bulk-enroll them.</p>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-line rounded-2xl overflow-hidden">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-line bg-subtle">
            {['Company', 'Contact', 'Status', 'Step', 'Next send'].map(h => (
              <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {enrollments.map(e => (
            <tr key={e.id} className="border-b border-line last:border-0 hover:bg-subtle/50 transition-colors">
              <td className="px-4 py-3 font-medium text-ink">{e.lead.company}</td>
              <td className="px-4 py-3 text-muted">{e.lead.contactName || '—'}</td>
              <td className="px-4 py-3">
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[e.status] || 'bg-subtle text-muted'}`}>
                  {e.status.toLowerCase()}
                </span>
              </td>
              <td className="px-4 py-3 text-muted">{e.currentStep + 1} / {stepCount}</td>
              <td className="px-4 py-3 text-muted text-[12px]">
                {e.nextSendAt ? new Date(e.nextSendAt).toLocaleDateString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Analytics Tab ─────────────────────────────────────────────────────────────

function AnalyticsTab({ analytics: a }: { analytics: Analytics }) {
  const funnel = [
    { label: 'Enrolled', value: a.totalEnrolled, color: 'bg-blue-500' },
    { label: 'Emails sent', value: a.emailsSent, color: 'bg-violet-500' },
    { label: 'Opened', value: a.emailsOpened, color: 'bg-amber-500' },
    { label: 'Replied', value: a.emailsReplied, color: 'bg-emerald-500' },
  ]
  const max = Math.max(...funnel.map(f => f.value), 1)

  return (
    <div className="space-y-4">
      {/* Funnel */}
      <div className="bg-surface border border-line rounded-2xl p-5">
        <h3 className="text-[13px] font-semibold text-ink mb-4">Funnel</h3>
        <div className="space-y-3">
          {funnel.map((f, i) => (
            <div key={f.label} className="flex items-center gap-3">
              <div className="w-20 text-[12px] text-muted text-right shrink-0">{f.label}</div>
              <div className="flex-1 bg-subtle rounded-full h-6 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(f.value / max) * 100}%` }}
                  transition={{ delay: i * 0.1, duration: 0.5, ease: 'easeOut' }}
                  className={`h-full ${f.color} rounded-full flex items-center px-2`}
                >
                  {f.value > 0 && <span className="text-[11px] font-semibold text-white">{f.value}</span>}
                </motion.div>
              </div>
              <div className="w-12 text-[12px] font-semibold text-ink shrink-0 text-right">{f.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Rates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface border border-line rounded-2xl p-5 text-center">
          <div className="text-[32px] font-bold text-amber-500">{a.openRate}%</div>
          <div className="text-[12px] text-muted mt-1">Open rate</div>
        </div>
        <div className="bg-surface border border-line rounded-2xl p-5 text-center">
          <div className="text-[32px] font-bold text-emerald-500">{a.replyRate}%</div>
          <div className="text-[12px] text-muted mt-1">Reply rate</div>
        </div>
      </div>

      {/* Status breakdown */}
      <div className="bg-surface border border-line rounded-2xl p-5">
        <h3 className="text-[13px] font-semibold text-ink mb-3">Enrollment status</h3>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(a.byStatus).map(([status, count]) => (
            <div key={status} className="bg-subtle rounded-xl p-3 text-center">
              <div className="text-[18px] font-semibold text-ink">{count}</div>
              <div className={`text-[10px] font-medium mt-0.5 ${STATUS_COLORS[status]?.split(' ')[1] || 'text-muted'}`}>
                {status.toLowerCase()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
