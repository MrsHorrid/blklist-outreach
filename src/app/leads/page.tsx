'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { ScoreBadge } from '@/components/ui/ScoreBadge'
import { LeadDrawer } from '@/components/leads/LeadDrawer'
import { formatDistanceToNow } from 'date-fns'

const STATUSES = ['ALL', 'DISCOVERED', 'CONTACTED', 'OPENED', 'REPLIED', 'MEETING', 'CLOSED', 'DISQUALIFIED']
const INDUSTRIES = ['ALL', 'eCommerce', 'Fashion', 'DTC', 'SaaS', 'Gaming', 'Beauty', 'Health', 'Finance', 'Travel', 'Media']

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
  _count: { emails: number; notes: number }
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [industryFilter, setIndustryFilter] = useState('ALL')
  const [showAddModal, setShowAddModal] = useState(false)

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      if (industryFilter !== 'ALL') params.set('industry', industryFilter)

      const res = await fetch(`/api/leads?${params}`)
      const data = await res.json()
      setLeads(data.leads || [])
      setTotal(data.total || 0)
    } catch (err) {
      console.error('Failed to fetch leads', err)
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, industryFilter])

  useEffect(() => {
    const t = setTimeout(fetchLeads, 200)
    return () => clearTimeout(t)
  }, [fetchLeads])

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-400">{total} leads in CRM</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAddModal(true)}
            className="px-3 py-2 text-sm border border-gray-200 hover:bg-gray-50 rounded-md text-gray-700 transition-colors">
            + Add Lead
          </button>
          <Link href="/leads/discover"
            className="px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors font-medium">
            ✦ Discover Leads
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 bg-white">
        <div className="relative flex-1 max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">⌕</span>
          <input
            type="text"
            placeholder="Search companies, contacts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400">
          {STATUSES.map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All statuses' : s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
        </select>
        <select value={industryFilter} onChange={(e) => setIndustryFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400">
          {INDUSTRIES.map((i) => <option key={i} value={i}>{i === 'ALL' ? 'All industries' : i}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">
            <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-3">◈</div>
            <p className="font-medium text-gray-500">No leads found</p>
            <p className="text-sm mt-1">
              <Link href="/leads/discover" className="text-indigo-600 hover:underline">Discover leads with AI</Link>
              {' '}or add one manually.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Company</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Industry</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Score</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Activity</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leads.map((lead) => (
                <tr key={lead.id}
                  onClick={() => setSelectedId(lead.id)}
                  className="hover:bg-indigo-50/30 cursor-pointer transition-colors group">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{lead.emoji || '🏢'}</span>
                      <div>
                        <div className="font-medium text-gray-900 group-hover:text-indigo-700 transition-colors">
                          {lead.company}
                        </div>
                        <div className="text-xs text-gray-400">{lead.domain}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{lead.industry}</td>
                  <td className="px-4 py-3">
                    {lead.contactName ? (
                      <div>
                        <div className="text-gray-700">{lead.contactName}</div>
                        <div className="text-xs text-gray-400">{lead.contactRole}</div>
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ScoreBadge score={lead.score} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge status={lead.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      {lead._count.emails > 0 && <span>✉ {lead._count.emails}</span>}
                      {lead._count.notes > 0 && <span>✎ {lead._count.notes}</span>}
                      {lead._count.emails === 0 && lead._count.notes === 0 && '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {formatDistanceToNow(new Date(lead.updatedAt), { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Lead Drawer */}
      <LeadDrawer
        leadId={selectedId}
        onClose={() => setSelectedId(null)}
        onUpdate={fetchLeads}
      />

      {/* Add Lead Modal */}
      {showAddModal && (
        <AddLeadModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => { setShowAddModal(false); fetchLeads() }}
        />
      )}
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
    setSaving(true)
    setError('')
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
    <>
      <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center animate-fade-in">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900">Add Lead</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Company *" value={form.company} onChange={(v) => set('company', v)} required />
              <Field label="Domain *" value={form.domain} onChange={(v) => set('domain', v)} placeholder="acme.com" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Industry *" value={form.industry} onChange={(v) => set('industry', v)} required />
              <Field label="Geography" value={form.geography} onChange={(v) => set('geography', v)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Company size" value={form.companySize} onChange={(v) => set('companySize', v)} />
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Lead score</label>
                <input type="number" min={0} max={100} value={form.score}
                  onChange={(e) => set('score', parseInt(e.target.value))}
                  className="w-full text-sm border border-gray-200 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Contact name" value={form.contactName} onChange={(v) => set('contactName', v)} />
              <Field label="Contact role" value={form.contactRole} onChange={(v) => set('contactRole', v)} />
            </div>
            <Field label="Contact email" value={form.contactEmail} onChange={(v) => set('contactEmail', v)} type="email" />
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
                rows={2} className="w-full text-sm border border-gray-200 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none" />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium disabled:opacity-50">
                {saving ? 'Saving…' : 'Add Lead'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

function Field({ label, value, onChange, required, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 font-medium block mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        required={required} placeholder={placeholder}
        className="w-full text-sm border border-gray-200 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
    </div>
  )
}
