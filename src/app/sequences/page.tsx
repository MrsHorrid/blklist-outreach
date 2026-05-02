'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Sequence {
  id: string
  name: string
  description?: string | null
  isActive: boolean
  createdAt: string
  steps: { id: string; order: number; delayDays: number; subject: string }[]
  _count: { enrollments: number }
  stats: Record<string, number>
}

export default function SequencesPage() {
  const router = useRouter()
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [showNew, setShowNew] = useState(false)

  const load = () =>
    fetch('/api/sequences').then(r => r.json()).then(d => {
      setSequences(d.sequences || [])
      setLoading(false)
    })

  useEffect(() => { load() }, [])

  const create = async () => {
    if (!newName.trim()) return
    setCreating(true)
    const res = await fetch('/api/sequences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    const { sequence } = await res.json()
    setCreating(false)
    setShowNew(false)
    setNewName('')
    router.push(`/sequences/${sequence.id}`)
  }

  const toggleActive = async (id: string, isActive: boolean) => {
    await fetch(`/api/sequences/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    })
    setSequences(s => s.map(seq => seq.id === id ? { ...seq, isActive: !isActive } : seq))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          className="w-5 h-5 border-2 border-line border-t-ink rounded-full" />
      </div>
    )
  }

  return (
    <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tighter text-ink">Sequences</h1>
          <p className="text-muted text-[13px] mt-1">Automated multi-step outreach campaigns. Set it and let it run.</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowNew(true)}
          className="h-10 px-5 bg-ink text-white dark:text-black text-[13px] font-semibold rounded-lg hover:opacity-90"
        >
          + New sequence
        </motion.button>
      </div>

      {/* New sequence modal */}
      <AnimatePresence>
        {showNew && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setShowNew(false) }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface border border-line rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <h2 className="text-[16px] font-semibold text-ink mb-4">Name your sequence</h2>
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && create()}
                placeholder="e.g. DTC Brand Intro — 3 Touch"
                className="w-full text-[13px] border border-line rounded-lg px-3.5 h-10 bg-canvas text-ink focus:border-accent focus:ring-2 focus:ring-accent/15 mb-4"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowNew(false)} className="h-9 px-4 text-[13px] text-muted rounded-lg hover:bg-subtle">Cancel</button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={create}
                  disabled={creating || !newName.trim()}
                  className="h-9 px-5 bg-ink text-white dark:text-black text-[13px] font-semibold rounded-lg disabled:opacity-50"
                >
                  {creating ? 'Creating…' : 'Create & open builder'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {sequences.length === 0 && (
        <div className="bg-surface border border-line rounded-2xl p-12 text-center">
          <div className="text-[32px] mb-3">⚡</div>
          <h2 className="text-[15px] font-semibold text-ink mb-1">No sequences yet</h2>
          <p className="text-[13px] text-muted mb-5 max-w-xs mx-auto">Build a multi-step email campaign. Leads automatically advance through steps.</p>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowNew(true)}
            className="h-9 px-5 bg-ink text-white dark:text-black text-[13px] font-semibold rounded-lg">
            Create your first sequence
          </motion.button>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sequences.map((seq, i) => {
          const active = seq.stats['ACTIVE'] ?? 0
          const replied = seq.stats['REPLIED'] ?? 0
          const completed = seq.stats['COMPLETED'] ?? 0
          const total = Object.values(seq.stats).reduce((a, b) => a + b, 0)
          const replyRate = total > 0 ? Math.round((replied / total) * 100) : 0

          return (
            <motion.div
              key={seq.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-surface border border-line rounded-2xl p-5 hover:border-accent/40 transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <Link href={`/sequences/${seq.id}`} className="text-[14px] font-semibold text-ink hover:text-accent truncate block">
                    {seq.name}
                  </Link>
                  {seq.description && <p className="text-[12px] text-muted mt-0.5 truncate">{seq.description}</p>}
                </div>
                <button
                  onClick={() => toggleActive(seq.id, seq.isActive)}
                  className={`ml-3 shrink-0 h-5 w-9 rounded-full transition-colors ${seq.isActive ? 'bg-emerald-500' : 'bg-line'}`}
                  title={seq.isActive ? 'Pause sequence' : 'Activate sequence'}
                >
                  <motion.div
                    animate={{ x: seq.isActive ? 16 : 2 }}
                    className="h-4 w-4 bg-white rounded-full shadow-sm"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>

              {/* Step pills */}
              <div className="flex items-center gap-1 mb-4 flex-wrap">
                {seq.steps.map((step, j) => (
                  <span key={step.id} className="text-[10px] font-medium bg-subtle text-muted px-2 py-0.5 rounded-full">
                    {j === 0 ? 'Day 0' : `+${seq.steps.slice(0, j + 1).reduce((acc, s) => acc + s.delayDays, 0)}d`}
                  </span>
                ))}
                {seq.steps.length === 0 && <span className="text-[11px] text-faint italic">No steps yet</span>}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: 'Active', value: active, color: 'text-blue-500' },
                  { label: 'Replied', value: replied, color: 'text-emerald-500' },
                  { label: 'Done', value: completed, color: 'text-faint' },
                ].map(s => (
                  <div key={s.label} className="text-center bg-subtle rounded-lg py-2">
                    <div className={`text-[15px] font-semibold ${s.color}`}>{s.value}</div>
                    <div className="text-[10px] text-faint">{s.label}</div>
                  </div>
                ))}
              </div>

              {replyRate > 0 && (
                <div className="text-[11px] text-muted mb-3">
                  <span className="font-semibold text-emerald-500">{replyRate}%</span> reply rate
                </div>
              )}

              <Link
                href={`/sequences/${seq.id}`}
                className="block text-center text-[12px] font-semibold text-accent border border-accent/30 rounded-lg py-2 hover:bg-accent/5 transition-colors"
              >
                Open builder →
              </Link>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
