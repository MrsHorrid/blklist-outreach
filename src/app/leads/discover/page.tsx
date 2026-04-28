'use client'

import { useState, useMemo } from 'react'
import { ScoreBadge } from '@/components/ui/ScoreBadge'

const INDUSTRIES = ['eCommerce', 'Fashion & Apparel', 'DTC Brands', 'SaaS', 'Gaming', 'Beauty & Skincare', 'Health & Wellness', 'Fintech', 'Travel', 'Media & Entertainment']
const SIZES = ['Startup (1-50)', 'SMB (51-200)', 'Mid-market (201-1000)', 'Enterprise (1000+)']
const GEOGRAPHIES = ['United States', 'United Kingdom', 'Europe', 'Global', 'APAC', 'North America']
const AD_ACTIVITIES = ['Actively running paid ads', 'Strong social presence', 'High content output', 'Running influencer campaigns', 'Any digital marketing activity']
const MIN_REVENUES = ['$1M+', '$5M+', '$10M+', '$50M+', '$100M+']

type SortKey = 'score' | 'company' | 'date'

interface DiscoveredLead {
  company: string
  domain: string
  emoji: string
  industry: string
  description: string
  contactName: string
  contactRole: string
  contactEmail: string
  contactEmailSource: 'scraped' | 'found' | 'guessed'
  contactLinkedIn: string
  signals: string[]
  score: number
  whyFit: string
  estimatedRevenue: string
  companySize: string
  _discoveredAt?: number
}

export default function DiscoverPage() {
  const [form, setForm] = useState({
    industry: 'eCommerce',
    geography: 'United States',
    companySize: 'Mid-market (201-1000)',
    adActivity: 'Actively running paid ads',
    minRevenue: '$10M+',
  })
  const [loading, setLoading] = useState(false)
  const [leads, setLeads] = useState<DiscoveredLead[]>([])
  const [webSearched, setWebSearched] = useState(false)
  const [error, setError] = useState('')
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [addingId, setAddingId] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('score')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const sortedLeads = useMemo(() => {
    return [...leads].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'score') cmp = a.score - b.score
      else if (sortKey === 'company') cmp = a.company.localeCompare(b.company)
      else if (sortKey === 'date') cmp = (a._discoveredAt ?? 0) - (b._discoveredAt ?? 0)
      return sortDir === 'desc' ? -cmp : cmp
    })
  }, [leads, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir(key === 'company' ? 'asc' : 'desc') }
  }

  const discover = async () => {
    setLoading(true)
    setError('')
    setLeads([])
    try {
      const res = await fetch('/api/leads/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Discovery failed')
      const ts = Date.now()
      setLeads((data.leads || []).map((l: DiscoveredLead, i: number) => ({ ...l, _discoveredAt: ts + i })))
      setWebSearched(!!data.webSearched)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
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
          company: lead.company,
          domain: lead.domain,
          emoji: lead.emoji,
          industry: lead.industry,
          companySize: lead.companySize,
          revenue: lead.estimatedRevenue,
          description: lead.description,
          contactName: lead.contactName,
          contactRole: lead.contactRole,
          contactEmail: lead.contactEmail,
          contactLinkedIn: lead.contactLinkedIn,
          signals: lead.signals,
          adChannels: [],
          score: lead.score,
          whyFit: lead.whyFit,
          source: 'discovery',
        }),
      })
      if (res.ok || res.status === 409) {
        setAddedIds((prev) => new Set(Array.from(prev).concat(lead.domain)))
      }
    } finally {
      setAddingId(null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Discover Leads</h1>
        <p className="text-gray-500 mt-1">
          AI finds high-quality brand partners that fit the BLKLIST profile — 30%+ CTR, premium placements.
        </p>
      </div>

      {/* Discovery Form */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">Search Criteria</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Industry</label>
            <select value={form.industry} onChange={(e) => set('industry', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400">
              {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Geography</label>
            <select value={form.geography} onChange={(e) => set('geography', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400">
              {GEOGRAPHIES.map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Company Size</label>
            <select value={form.companySize} onChange={(e) => set('companySize', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400">
              {SIZES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Min Revenue</label>
            <select value={form.minRevenue} onChange={(e) => set('minRevenue', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400">
              {MIN_REVENUES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Ad Activity Signal</label>
            <select value={form.adActivity} onChange={(e) => set('adActivity', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400">
              {AD_ACTIVITIES.map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>
        </div>
        <button
          onClick={discover}
          disabled={loading}
          className="mt-5 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Agent is researching leads…
            </>
          ) : '✦ Discover with AI'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-4 mb-4">
          {error}
        </div>
      )}

      {/* Results */}
      {leads.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-800">{leads.length} leads found</h2>
              {webSearched && (
                <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                  🔍 web-enriched
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 mr-1">Sort:</span>
              {([['score', 'Relevance'], ['company', 'A–Z'], ['date', 'Date']] as [SortKey, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => toggleSort(key)}
                  className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                    sortKey === key
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-gray-200 text-gray-500 hover:border-indigo-300'
                  }`}
                >
                  {label} {sortKey === key ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {sortedLeads.map((lead) => (
              <div key={lead.domain}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-200 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="text-2xl mt-0.5">{lead.emoji}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{lead.company}</h3>
                        <ScoreBadge score={lead.score} />
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {lead.domain} · {lead.companySize} · {lead.estimatedRevenue}
                      </div>
                      <p className="text-sm text-gray-600 mt-2 leading-relaxed">{lead.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => addToCRM(lead)}
                    disabled={addedIds.has(lead.domain) || addingId === lead.domain}
                    className={`shrink-0 px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                      addedIds.has(lead.domain)
                        ? 'bg-green-50 text-green-600 cursor-default'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {addedIds.has(lead.domain) ? '✓ Added' : addingId === lead.domain ? '…' : '+ Add to CRM'}
                  </button>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-50 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-gray-400 mb-1.5">Marketing signals</div>
                    <div className="flex flex-wrap gap-1">
                      {lead.signals.map((s) => (
                        <span key={s} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-full">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Why BLKLIST fits</div>
                    <p className="text-xs text-gray-600 leading-relaxed">{lead.whyFit}</p>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-gray-50 flex items-center justify-between gap-3">
                  <div className="text-xs text-gray-500">
                    <span className="font-medium text-gray-700">{lead.contactName}</span>
                    <span className="text-gray-400"> · {lead.contactRole}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {lead.contactLinkedIn && (
                      <a
                        href={lead.contactLinkedIn}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors"
                        title="Open LinkedIn profile"
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                        LinkedIn
                      </a>
                    )}
                    <button
                      onClick={() => copyEmail(lead.contactEmail)}
                      title={
                        lead.contactEmailSource === 'scraped' ? 'Found directly in company website HTML' :
                        lead.contactEmailSource === 'found' ? 'Found via web search' :
                        'Pattern-constructed — verify before sending'
                      }
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-colors font-mono ${
                        lead.contactEmailSource === 'scraped' ? 'text-green-700 bg-green-50 hover:bg-green-100' :
                        lead.contactEmailSource === 'found'   ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' :
                                                                'text-gray-500 bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      {copiedEmail === lead.contactEmail ? '✓ copied' : lead.contactEmail}
                      <span className="font-sans text-[10px] opacity-60 ml-0.5">
                        {lead.contactEmailSource === 'scraped' ? '✓scraped' :
                         lead.contactEmailSource === 'found'   ? '✓found' : '~guess'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && leads.length === 0 && !error && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">✦</div>
          <p className="font-medium text-gray-500">Set your criteria and run discovery</p>
          <p className="text-sm mt-1">Claude will research 5 highly qualified leads in seconds</p>
        </div>
      )}
    </div>
  )
}
