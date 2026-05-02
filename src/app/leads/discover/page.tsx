'use client'

import { useState, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ScoreBadge } from '@/components/ui/ScoreBadge'

const INDUSTRIES = ['eCommerce', 'Fashion & Apparel', 'DTC Brands', 'SaaS', 'Gaming', 'Beauty & Skincare', 'Health & Wellness', 'Fintech', 'Travel', 'Media & Entertainment', 'Food & Beverage', 'Home & Lifestyle', 'Sports & Outdoors', 'B2B Software', 'Agency']
const SIZES = ['Startup (1-50)', 'SMB (51-200)', 'Mid-market (201-1000)', 'Enterprise (1000+)']
const GEOGRAPHIES = ['United States', 'United Kingdom', 'Europe', 'Global', 'APAC', 'North America']
const AD_ACTIVITIES = ['Actively running paid ads', 'Strong social presence', 'High content output', 'Running influencer campaigns', 'Any digital marketing activity']
const MIN_REVENUES = ['$1M+', '$5M+', '$10M+', '$50M+', '$100M+']
const COUNTS = [5, 10, 20]

interface DiscoveredLead {
  company: string; domain: string; emoji: string; industry: string; description: string
  contactName: string; contactRole: string; contactEmail: string
  contactEmailSource: 'scraped' | 'found' | 'guessed'; contactLinkedIn: string
  signals: string[]; score: number; whyFit: string; estimatedRevenue: string; companySize: string
  _smtpResult?: string; _kept?: boolean; _state?: 'enriching' | 'verified' | 'dropped'
}

type SortKey = 'score' | 'company' | 'date'

export default function DiscoverPage() {
  const [form, setForm] = useState({
    industry: 'eCommerce', geography: 'United States', companySize: 'Mid-market (201-1000)',
    adActivity: 'Actively running paid ads', minRevenue: '$10M+',
  })
  const [count, setCount] = useState(10)
  const [streaming, setStreaming] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [leads, setLeads] = useState<DiscoveredLead[]>([])
  const [enrichingDomains, setEnrichingDomains] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [addingId, setAddingId] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('score')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [sequences, setSequences] = useState<{ id: string; name: string }[]>([])
  const [enrollSequence, setEnrollSequence] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const esRef = useRef<EventSource | null>(null)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const sortedLeads = useMemo(() => {
    return [...leads].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'score') cmp = a.score - b.score
      else if (sortKey === 'company') cmp = a.company.localeCompare(b.company)
      return sortDir === 'desc' ? -cmp : cmp
    })
  }, [leads, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir(key === 'company' ? 'asc' : 'desc') }
  }

  const stopStream = () => {
    esRef.current?.close()
    esRef.current = null
    setStreaming(false)
  }

  const discover = () => {
    stopStream()
    setError('')
    setLeads([])
    setEnrichingDomains(new Set())
    setStatusMsg('Connecting…')
    setStreaming(true)

    const params = new URLSearchParams({
      ...form, count: String(count),
    })
    const es = new EventSource(`/api/leads/discover/stream?${params}`)
    esRef.current = es

    es.addEventListener('status', (e) => {
      setStatusMsg(JSON.parse(e.data).message)
    })

    es.addEventListener('candidate', (e) => {
      const c = JSON.parse(e.data)
      setEnrichingDomains(prev => new Set([...prev, c.domain]))
      setLeads(prev => [...prev, { ...c, _state: 'enriching' }])
    })

    es.addEventListener('lead', (e) => {
      const lead = JSON.parse(e.data)
      setEnrichingDomains(prev => { const next = new Set(prev); next.delete(lead.domain); return next })
      setLeads(prev => prev.map(l =>
        l.domain === lead.domain
          ? { ...lead, _state: lead._kept ? 'verified' : 'dropped' }
          : l
      ))
    })

    es.addEventListener('done', () => {
      setStatusMsg('')
      setStreaming(false)
      es.close()
    })

    es.addEventListener('error', (e) => {
      try { const d = JSON.parse((e as MessageEvent).data); setError(d.message) } catch {}
      setStreaming(false)
      es.close()
    })

    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        setStreaming(false)
      }
    }
  }

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email)
    setCopiedEmail(email)
    setTimeout(() => setCopiedEmail(null), 2000)
  }

  const addToCRM = async (lead: DiscoveredLead) => {
    setAddingId(lead.domain)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: lead.company, domain: lead.domain, emoji: lead.emoji, industry: lead.industry,
          companySize: lead.companySize, revenue: lead.estimatedRevenue, description: lead.description,
          contactName: lead.contactName, contactRole: lead.contactRole, contactEmail: lead.contactEmail,
          contactLinkedIn: lead.contactLinkedIn, signals: lead.signals, adChannels: [],
          score: lead.score, whyFit: lead.whyFit, source: 'discovery',
        }),
      })
      if (res.ok || res.status === 409) setAddedIds(prev => new Set([...prev, lead.domain]))
    } finally { setAddingId(null) }
  }

  const saveAll = async () => {
    const toSave = sortedLeads.filter(l => l._state === 'verified' && !addedIds.has(l.domain))
    for (const lead of toSave) await addToCRM(lead)
  }

  const loadSequencesAndEnroll = async () => {
    const res = await fetch('/api/sequences')
    const { sequences: seqs } = await res.json()
    setSequences(seqs || [])
  }

  const bulkEnroll = async () => {
    if (!enrollSequence) return
    setEnrolling(true)
    const saved = sortedLeads.filter(l => addedIds.has(l.domain))
    // Get their IDs from the DB
    const leadsRes = await fetch('/api/leads?limit=200')
    const { leads: dbLeads } = await leadsRes.json()
    const domainToId: Record<string, string> = {}
    for (const l of dbLeads) domainToId[l.domain] = l.id

    const leadIds = saved.map(l => domainToId[l.domain]).filter(Boolean)
    if (leadIds.length > 0) {
      await fetch('/api/leads/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enroll', leadIds, sequenceId: enrollSequence }),
      })
    }
    setEnrolling(false)
  }

  const verifiedLeads = sortedLeads.filter(l => l._state === 'verified')
  const droppedCount = sortedLeads.filter(l => l._state === 'dropped').length
  const enrichingCount = enrichingDomains.size

  return (
    <div className="max-w-[860px] mx-auto px-6 sm:px-8 py-10 lg:py-12">
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold tracking-tighter text-ink">Discover</h1>
        <p className="text-muted text-[13px] mt-1">
          AI researches real companies, finds verified contacts, and delivers them in real time.
        </p>
      </div>

      {/* Form */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="bg-surface border border-line rounded-xl p-6 mb-5">
        <div className="grid grid-cols-2 gap-3.5">
          <Select label="Industry"    value={form.industry}    options={INDUSTRIES}    onChange={v => set('industry', v)} />
          <Select label="Geography"   value={form.geography}   options={GEOGRAPHIES}   onChange={v => set('geography', v)} />
          <Select label="Size"        value={form.companySize} options={SIZES}         onChange={v => set('companySize', v)} />
          <Select label="Min revenue" value={form.minRevenue}  options={MIN_REVENUES}  onChange={v => set('minRevenue', v)} />
          <div className="col-span-2">
            <Select label="Ad activity signal" value={form.adActivity} options={AD_ACTIVITIES} onChange={v => set('adActivity', v)} />
          </div>
        </div>

        {/* Count selector */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-[11.5px] text-muted font-medium">Leads to find:</span>
          {COUNTS.map(c => (
            <button key={c} onClick={() => setCount(c)}
              className={`h-7 w-10 text-[12px] font-semibold rounded-lg border transition-colors ${
                count === c ? 'bg-ink text-white dark:text-black border-ink' : 'border-line bg-surface text-muted hover:border-ink'
              }`}>
              {c}
            </button>
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          <motion.button
            onClick={streaming ? stopStream : discover}
            whileTap={{ scale: 0.98 }}
            className={`flex-1 h-11 text-[13px] font-semibold rounded-lg inline-flex items-center justify-center gap-2 transition-colors ${
              streaming
                ? 'bg-red-500/10 text-red-600 border border-red-200 hover:bg-red-500/15'
                : 'bg-ink text-white dark:text-black hover:opacity-90'
            }`}
          >
            {streaming ? (
              <>
                <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  className="w-3.5 h-3.5 border-2 border-red-400/40 border-t-red-500 rounded-full" />
                {statusMsg || 'Discovering…'} — click to stop
              </>
            ) : (
              <><SparkIcon /> Discover {count} leads</>
            )}
          </motion.button>
        </div>
      </motion.div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-950/30 border border-red-200/60 text-red-600 text-[12.5px] rounded-xl px-4 py-3 mb-4">
          {error}
        </motion.div>
      )}

      {/* Live stats bar */}
      <AnimatePresence>
        {(leads.length > 0) && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-3 text-[12px]">
              <span className="font-semibold text-ink">{verifiedLeads.length} verified</span>
              {enrichingCount > 0 && <span className="text-muted">{enrichingCount} enriching…</span>}
              {droppedCount > 0 && <span className="text-faint">{droppedCount} dropped</span>}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {([['score', 'Relevance'], ['company', 'A–Z']] as [SortKey, string][]).map(([key, label]) => (
                  <button key={key} onClick={() => toggleSort(key)}
                    className={`text-[11px] px-2.5 h-7 rounded-md border font-medium ${
                      sortKey === key ? 'bg-ink text-white dark:text-black border-ink' : 'border-line bg-surface text-muted hover:text-ink'
                    }`}>
                    {label} {sortKey === key ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                  </button>
                ))}
              </div>
              {verifiedLeads.length > 0 && (
                <motion.button whileTap={{ scale: 0.97 }} onClick={saveAll}
                  className="h-7 px-3 bg-emerald-500 text-white text-[11px] font-semibold rounded-md hover:bg-emerald-600">
                  Save all verified ({verifiedLeads.filter(l => !addedIds.has(l.domain)).length})
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {sortedLeads.map((lead) => (
            <motion.div
              key={lead.domain}
              layout
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: lead._state === 'dropped' ? 0.4 : 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className={`bg-surface border rounded-xl p-5 transition-colors ${
                lead._state === 'verified' ? 'border-emerald-200/60 dark:border-emerald-900/40' :
                lead._state === 'dropped' ? 'border-line opacity-50' : 'border-line'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="text-2xl mt-0.5 select-none">{lead.emoji || '🏢'}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-[14px] font-semibold text-ink tracking-tight">{lead.company}</h3>
                      {lead._state === 'enriching' && (
                        <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
                          className="text-[10px] font-medium text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                          enriching…
                        </motion.span>
                      )}
                      {lead._state === 'verified' && (
                        <span className="text-[10px] font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">✓ verified</span>
                      )}
                      {lead._state === 'dropped' && (
                        <span className="text-[10px] font-medium text-faint bg-subtle px-2 py-0.5 rounded-full">no contact found</span>
                      )}
                      {lead._state !== 'enriching' && lead._state !== 'dropped' && <ScoreBadge score={lead.score} />}
                    </div>
                    <div className="text-[11.5px] text-faint mt-0.5">
                      {lead.domain} · {lead.companySize} · {lead.estimatedRevenue}
                    </div>
                    {lead._state !== 'enriching' && (
                      <p className="text-[13px] text-muted mt-2 leading-relaxed">{lead.description}</p>
                    )}
                  </div>
                </div>

                {lead._state !== 'dropped' && lead._state !== 'enriching' && (
                  <button
                    onClick={() => addToCRM(lead)}
                    disabled={addedIds.has(lead.domain) || addingId === lead.domain}
                    className={`shrink-0 h-8 px-3 text-[12px] rounded-lg font-semibold transition-colors ${
                      addedIds.has(lead.domain)
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 cursor-default border border-emerald-200/60'
                        : 'bg-ink text-white dark:text-black hover:opacity-90'
                    }`}
                  >
                    {addedIds.has(lead.domain) ? '✓ Saved' : addingId === lead.domain ? '…' : '+ Save'}
                  </button>
                )}
              </div>

              {lead._state !== 'enriching' && lead._state !== 'dropped' && (
                <>
                  <div className="mt-4 pt-4 border-t border-line grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10.5px] text-faint font-semibold uppercase tracking-[0.08em] mb-1.5">Signals</div>
                      <div className="flex flex-wrap gap-1">
                        {(lead.signals || []).map(s => (
                          <span key={s} className="px-1.5 h-5 inline-flex items-center text-[11px] bg-subtle text-muted rounded-md border border-line">{s}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10.5px] text-faint font-semibold uppercase tracking-[0.08em] mb-1.5">Why fit</div>
                      <p className="text-[12px] text-muted leading-relaxed">{lead.whyFit}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-line flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-[12px] text-muted">
                      <span className="font-medium text-ink">{lead.contactName}</span>
                      <span className="text-faint"> · {lead.contactRole}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {lead.contactLinkedIn && (
                        <a href={lead.contactLinkedIn} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-[11.5px] text-sky-700 bg-sky-50 dark:bg-sky-950/30 hover:bg-sky-100 border border-sky-200/60 px-2 h-7 rounded-md font-medium">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                          LinkedIn
                        </a>
                      )}
                      {lead.contactEmail && (
                        <button onClick={() => copyEmail(lead.contactEmail)}
                          title={`${lead.contactEmailSource === 'scraped' ? 'Scraped from site' : lead.contactEmailSource === 'found' ? 'Found in web search' : 'Pattern-guessed'} · SMTP: ${lead._smtpResult || 'unchecked'}`}
                          className={`flex items-center gap-1.5 text-[11.5px] px-2 h-7 rounded-md font-mono border ${
                            lead.contactEmailSource === 'scraped' ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/60' :
                            lead.contactEmailSource === 'found'   ? 'text-violet-700 bg-violet-50 dark:bg-violet-950/20 border-violet-200/60' :
                                                                    'text-muted bg-subtle border-line'
                          }`}>
                          {copiedEmail === lead.contactEmail ? '✓ copied' : lead.contactEmail}
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Enroll in sequence CTA — appears after saving */}
      <AnimatePresence>
        {addedIds.size > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-surface border border-accent/30 rounded-xl p-4 flex items-center gap-3 flex-wrap">
            <span className="text-[13px] font-medium text-ink">Enroll {addedIds.size} saved leads in a sequence?</span>
            <select
              value={enrollSequence}
              onChange={e => setEnrollSequence(e.target.value)}
              onFocus={loadSequencesAndEnroll}
              className="flex-1 min-w-[180px] text-[13px] border border-line rounded-lg px-3 h-9 bg-canvas text-ink"
            >
              <option value="">Select sequence…</option>
              {sequences.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <motion.button whileTap={{ scale: 0.97 }} onClick={bulkEnroll}
              disabled={!enrollSequence || enrolling}
              className="h-9 px-4 bg-accent text-white text-[13px] font-semibold rounded-lg disabled:opacity-50">
              {enrolling ? 'Enrolling…' : 'Enroll'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {!streaming && leads.length === 0 && !error && (
        <div className="text-center py-20">
          <div className="w-12 h-12 rounded-xl bg-subtle border border-line flex items-center justify-center mx-auto mb-4">
            <SparkIcon className="w-5 h-5 text-faint" />
          </div>
          <p className="text-[14px] font-medium text-ink">Set your criteria and hit Discover</p>
          <p className="text-[12.5px] text-faint mt-1">Leads appear in real time as the AI enriches each one</p>
        </div>
      )}
    </div>
  )
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[11.5px] text-muted font-medium block mb-1.5 tracking-tight">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full text-[13px] border border-line bg-surface rounded-lg px-3 h-10 focus:border-accent focus:ring-2 focus:ring-accent/15">
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  )
}

function SparkIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z" />
    </svg>
  )
}
