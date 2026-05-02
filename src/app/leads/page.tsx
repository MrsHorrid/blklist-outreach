'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ScoreBadge } from '@/components/ui/ScoreBadge'
import { LeadDrawer } from '@/components/leads/LeadDrawer'
import { formatDistanceToNow } from 'date-fns'

const INDUSTRIES = ['ALL', 'eCommerce', 'Fashion', 'DTC', 'SaaS', 'Gaming', 'Beauty', 'Health', 'Finance', 'Travel', 'Media']

const STATUS_DOT: Record<string, string> = {
  DISCOVERED:    'bg-zinc-400',
  CONTACTED:     'bg-sky-500',
  OPENED:        'bg-amber-500',
  REPLIED:       'bg-violet-500',
  MEETING:       'bg-emerald-500',
  CLOSED:        'bg-emerald-600',
  DISQUALIFIED:  'bg-red-400',
}

const ENROLLMENT_STATUS_COLOR: Record<string, string> = {
  ACTIVE:   'bg-indigo-500/10 text-indigo-600 border-indigo-300/40',
  PAUSED:   'bg-amber-500/10 text-amber-600 border-amber-300/40',
}

interface Tag { id: string; name: string; color: string }
interface ActiveEnrollment {
  id: string
  status: string
  currentStep: number
  sequence: { id: string; name: string }
}
interface Lead {
  id: string
  company: string
  domain: string
  emoji?: string
  industry: string
  geography?: string
  companySize?: string
  contactName?: string
  contactRole?: string
  status: string
  score: number
  updatedAt: string
  tags: Tag[]
  _count: { emails: number; notes: number }
  activeEnrollment?: ActiveEnrollment | null
}
interface Sequence { id: string; name: string }

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [industryFilter, setIndustryFilter] = useState('ALL')
  const [tagFilter, setTagFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [allTags, setAllTags] = useState<Tag[]>([])

  // Bulk-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [showSeqMenu, setShowSeqMenu] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [bulkWorking, setBulkWorking] = useState(false)
  const seqMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/tags').then(r => r.json()).then(d => setAllTags(d.tags || []))
  }, [])

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (industryFilter !== 'ALL') params.set('industry', industryFilter)
      if (tagFilter) params.set('tagId', tagFilter)
      const res = await fetch(`/api/leads?${params}`)
      const data = await res.json()
      setLeads(data.leads || [])
      setTotal(data.total || 0)
    } finally {
      setLoading(false)
    }
  }, [search, industryFilter, tagFilter])

  useEffect(() => {
    const t = setTimeout(fetchLeads, 200)
    return () => clearTimeout(t)
  }, [fetchLeads])

  // Close seq menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (seqMenuRef.current && !seqMenuRef.current.contains(e.target as Node)) setShowSeqMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === leads.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(leads.map(l => l.id)))
  }

  const loadSequences = async () => {
    if (sequences.length > 0) return
    const res = await fetch('/api/sequences')
    const data = await res.json()
    setSequences(data.sequences || [])
  }

  const enrollSelected = async (sequenceId: string) => {
    setEnrolling(true)
    try {
      await fetch(`/api/sequences/${sequenceId}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: Array.from(selectedIds) }),
      })
      setShowSeqMenu(false)
      setSelectedIds(new Set())
      fetchLeads()
    } finally {
      setEnrolling(false)
    }
  }

  const exportSelected = async () => {
    setBulkWorking(true)
    try {
      const res = await fetch('/api/leads/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export', leadIds: Array.from(selectedIds) }),
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setBulkWorking(false)
    }
  }

  const deleteSelected = async () => {
    if (!confirm(`Delete ${selectedIds.size} lead${selectedIds.size !== 1 ? 's' : ''}? This cannot be undone.`)) return
    setBulkWorking(true)
    try {
      await fetch('/api/leads/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', leadIds: Array.from(selectedIds) }),
      })
      setSelectedIds(new Set())
      fetchLeads()
    } finally {
      setBulkWorking(false)
    }
  }

  const allSelected = leads.length > 0 && selectedIds.size === leads.length
  const someSelected = selectedIds.size > 0 && !allSelected

  return (
    <div className="flex flex-col h-full">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-6 lg:px-8 h-16 border-b border-line bg-canvas/80 backdrop-blur-md sticky top-0 z-10">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight text-ink">Leads</h1>
          <p className="text-[12px] text-faint">{total} {total === 1 ? 'lead' : 'leads'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="h-9 px-3 text-[12.5px] font-medium border border-line bg-surface text-ink hover:bg-subtle rounded-lg"
          >
            + New
          </button>
          <Link
            href="/leads/discover"
            className="h-9 px-3.5 text-[12.5px] font-semibold inline-flex items-center gap-1.5 bg-ink hover:bg-zinc-800 text-white rounded-lg"
          >
            <SparkIcon /> Discover
          </Link>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-2 px-6 lg:px-8 py-3 border-b border-line bg-surface">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-faint">
            <SearchIcon />
          </span>
          <input
            type="text"
            placeholder="Search companies, contacts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 h-9 text-[13px] border border-line bg-canvas/40 rounded-lg focus:bg-surface focus:border-accent focus:ring-2 focus:ring-accent/15"
          />
        </div>
        <select
          value={industryFilter}
          onChange={(e) => setIndustryFilter(e.target.value)}
          className="text-[13px] border border-line bg-surface rounded-lg px-3 h-9 focus:border-accent focus:ring-2 focus:ring-accent/15"
        >
          {INDUSTRIES.map((i) => <option key={i} value={i}>{i === 'ALL' ? 'All industries' : i}</option>)}
        </select>
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="text-[13px] border border-line bg-surface rounded-lg px-3 h-9 focus:border-accent focus:ring-2 focus:ring-accent/15"
        >
          <option value="">All tags</option>
          {allTags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto pb-20">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Spinner />
          </div>
        ) : leads.length === 0 ? (
          <Empty />
        ) : (
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-canvas/95 backdrop-blur-md z-[1]">
              <tr className="border-b border-line">
                <th className="pl-5 pr-2 py-3 w-9">
                  <CheckBox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={toggleSelectAll}
                  />
                </th>
                <Th>Company</Th>
                <Th>Industry</Th>
                <Th>Contact</Th>
                <Th>Score</Th>
                <Th>Tags</Th>
                <Th>Sequence</Th>
                <Th>Activity</Th>
                <Th>Updated</Th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, i) => (
                <motion.tr
                  key={lead.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.015, 0.3), duration: 0.18 }}
                  onClick={() => setSelectedId(lead.id)}
                  className={`border-b border-line hover:bg-subtle/60 cursor-pointer group ${selectedIds.has(lead.id) ? 'bg-accent/[0.04]' : ''}`}
                >
                  <td className="pl-5 pr-2 py-3.5 w-9" onClick={e => e.stopPropagation()}>
                    <CheckBox
                      checked={selectedIds.has(lead.id)}
                      onChange={() => toggleSelect(lead.id)}
                    />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base w-7 h-7 flex items-center justify-center bg-subtle rounded-md group-hover:bg-surface border border-line">
                        {lead.emoji || '🏢'}
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium text-ink truncate">{lead.company}</div>
                        <div className="text-[11.5px] text-faint truncate">{lead.domain}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-muted">{lead.industry}</td>
                  <td className="px-4 py-3.5">
                    {lead.contactName ? (
                      <div>
                        <div className="text-ink">{lead.contactName}</div>
                        <div className="text-[11.5px] text-faint">{lead.contactRole}</div>
                      </div>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[lead.status]}`} />
                      <ScoreBadge score={lead.score} />
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {lead.tags?.length ? lead.tags.map(tag => (
                        <span
                          key={tag.id}
                          className="px-1.5 h-5 inline-flex items-center text-[11px] rounded-md font-medium border"
                          style={{ borderColor: `${tag.color}40`, backgroundColor: `${tag.color}14`, color: tag.color }}
                        >
                          {tag.name}
                        </span>
                      )) : <span className="text-faint">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    {lead.activeEnrollment ? (
                      <span className={`inline-flex items-center gap-1 px-2 h-5 text-[11px] font-medium rounded border ${ENROLLMENT_STATUS_COLOR[lead.activeEnrollment.status] || 'bg-zinc-100 text-zinc-500 border-zinc-200'}`}>
                        <span className="w-1 h-1 rounded-full bg-current opacity-70" />
                        {lead.activeEnrollment.sequence.name}
                      </span>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3 text-[11.5px] text-faint">
                      {lead._count.emails > 0 && <span>✉ {lead._count.emails}</span>}
                      {lead._count.notes > 0 && <span>✎ {lead._count.notes}</span>}
                      {lead._count.emails === 0 && lead._count.notes === 0 && '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-[11.5px] text-faint whitespace-nowrap">
                    {formatDistanceToNow(new Date(lead.updatedAt), { addSuffix: true })}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Bulk action bar ── */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 40 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2.5 bg-ink text-white rounded-2xl shadow-2xl shadow-black/30"
          >
            <span className="text-[12.5px] font-medium text-white/70 mr-1 whitespace-nowrap">
              {selectedIds.size} selected
            </span>
            <div className="w-px h-4 bg-white/15" />

            {/* Enroll in sequence */}
            <div className="relative" ref={seqMenuRef}>
              <button
                onClick={() => { loadSequences(); setShowSeqMenu(p => !p) }}
                disabled={enrolling}
                className="flex items-center gap-1.5 h-8 px-3 text-[12.5px] font-medium bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
              >
                <SequenceIcon />
                {enrolling ? 'Enrolling…' : 'Add to sequence'}
              </button>
              <AnimatePresence>
                {showSeqMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{ duration: 0.12 }}
                    className="absolute bottom-full mb-2 left-0 w-56 bg-surface border border-line rounded-xl shadow-float overflow-hidden"
                  >
                    {sequences.length === 0 ? (
                      <div className="px-4 py-3 text-[12.5px] text-faint">
                        No sequences yet.{' '}
                        <Link href="/sequences" className="text-accent hover:underline">Create one →</Link>
                      </div>
                    ) : (
                      sequences.map(seq => (
                        <button
                          key={seq.id}
                          onClick={() => enrollSelected(seq.id)}
                          className="w-full text-left px-4 py-2.5 text-[13px] text-ink hover:bg-subtle transition-colors"
                        >
                          {seq.name}
                        </button>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Export CSV */}
            <button
              onClick={exportSelected}
              disabled={bulkWorking}
              className="flex items-center gap-1.5 h-8 px-3 text-[12.5px] font-medium bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
            >
              <ExportIcon />
              Export CSV
            </button>

            {/* Delete */}
            <button
              onClick={deleteSelected}
              disabled={bulkWorking}
              className="flex items-center gap-1.5 h-8 px-3 text-[12.5px] font-medium bg-red-500/20 hover:bg-red-500/35 text-red-300 rounded-lg transition-colors disabled:opacity-50"
            >
              <TrashIcon />
              Delete
            </button>

            <div className="w-px h-4 bg-white/15" />
            <button
              onClick={() => setSelectedIds(new Set())}
              className="w-7 h-7 flex items-center justify-center text-white/50 hover:text-white/90 rounded-lg hover:bg-white/10 transition-colors text-sm"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <LeadDrawer leadId={selectedId} onClose={() => setSelectedId(null)} onUpdate={fetchLeads} />

      <AnimatePresence>
        {showAddModal && (
          <AddLeadModal onClose={() => setShowAddModal(false)} onCreated={() => { setShowAddModal(false); fetchLeads() }} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CheckBox({ checked, indeterminate, onChange }: {
  checked: boolean
  indeterminate?: boolean
  onChange: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate
  }, [indeterminate])
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      onClick={e => e.stopPropagation()}
      className="w-3.5 h-3.5 rounded border-line accent-accent cursor-pointer"
    />
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-4 first:pl-6 py-3 text-[10.5px] font-semibold text-faint uppercase tracking-[0.08em] whitespace-nowrap">
      {children}
    </th>
  )
}

function Empty() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-12 h-12 rounded-xl bg-subtle border border-line flex items-center justify-center mb-4">
        <SparkIcon className="w-5 h-5 text-faint" />
      </div>
      <p className="text-[14px] font-medium text-ink">No leads found</p>
      <p className="text-[12.5px] text-faint mt-1 mb-5 max-w-[280px]">
        Try adjusting your filters, or discover new companies with AI.
      </p>
      <Link
        href="/leads/discover"
        className="h-9 px-3.5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-white bg-ink rounded-lg hover:bg-zinc-800"
      >
        <SparkIcon /> Discover leads
      </Link>
    </div>
  )
}

function AddLeadModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    company: '', domain: '', industry: '', geography: '',
    companySize: '', contactName: '', contactRole: '', contactEmail: '',
    description: '', score: 70,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError('')
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, source: 'manual', signals: [], adChannels: [] }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error || 'Failed to create lead'); return }
    onCreated()
  }

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        onClick={e => e.stopPropagation()}
        className="bg-surface rounded-2xl shadow-float w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 h-14 border-b border-line">
          <h2 className="text-[14px] font-semibold text-ink">Add lead</h2>
          <button onClick={onClose} className="text-faint hover:text-ink p-1">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company" value={form.company} onChange={(v) => set('company', v)} required />
            <Field label="Domain" value={form.domain} onChange={(v) => set('domain', v)} placeholder="acme.com" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Industry" value={form.industry} onChange={(v) => set('industry', v)} required />
            <Field label="Geography" value={form.geography} onChange={(v) => set('geography', v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company size" value={form.companySize} onChange={(v) => set('companySize', v)} />
            <div>
              <label className="text-[11.5px] text-muted font-medium block mb-1.5">Score</label>
              <input
                type="number" min={0} max={100} value={form.score}
                onChange={(e) => set('score', parseInt(e.target.value))}
                className="w-full text-[13px] border border-line rounded-lg px-3.5 h-10 bg-surface focus:border-accent focus:ring-2 focus:ring-accent/15"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact name" value={form.contactName} onChange={(v) => set('contactName', v)} />
            <Field label="Contact role" value={form.contactRole} onChange={(v) => set('contactRole', v)} />
          </div>
          <Field label="Contact email" value={form.contactEmail} onChange={(v) => set('contactEmail', v)} type="email" />
          <div>
            <label className="text-[11.5px] text-muted font-medium block mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
              className="w-full text-[13px] border border-line rounded-lg px-3.5 py-2.5 bg-surface focus:border-accent focus:ring-2 focus:ring-accent/15 resize-none"
            />
          </div>
          {error && <p className="text-[12px] text-red-500">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-10 border border-line rounded-lg text-[13px] font-medium text-muted hover:bg-subtle">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 h-10 bg-ink hover:bg-zinc-800 text-white rounded-lg text-[13px] font-semibold disabled:opacity-50">
              {saving ? 'Saving…' : 'Add lead'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

function Field({ label, value, onChange, required, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="text-[11.5px] text-muted font-medium block mb-1.5">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full text-[13px] border border-line rounded-lg px-3.5 h-10 bg-surface focus:border-accent focus:ring-2 focus:ring-accent/15"
      />
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

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4-4" />
    </svg>
  )
}

function SparkIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z" />
    </svg>
  )
}

function SequenceIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M4 10h10M4 14h13M4 18h7" />
      <circle cx="20" cy="17" r="3" />
      <path d="M20 15.5v1.5l1 1" />
    </svg>
  )
}

function ExportIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12M8 11l4 4 4-4" />
      <path d="M5 19h14" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </svg>
  )
}
