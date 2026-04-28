'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/Badge'
import { ScoreBadge } from '@/components/ui/ScoreBadge'
import { formatDistanceToNow } from 'date-fns'

const STATUSES = ['DISCOVERED', 'CONTACTED', 'OPENED', 'REPLIED', 'MEETING', 'CLOSED', 'DISQUALIFIED']
const TONES = ['confident', 'premium', 'casual', 'urgent'] as const

const TAG_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#0ea5e9', '#64748b',
]

interface Lead {
  id: string
  company: string
  domain: string
  emoji?: string
  industry: string
  geography?: string
  companySize?: string
  revenue?: string
  description?: string
  contactName?: string
  contactRole?: string
  contactEmail?: string
  contactLinkedIn?: string
  brandTone?: string
  signals: string[]
  adChannels: string[]
  targetAudience?: string
  status: string
  score: number
  whyFit?: string
  createdAt: string
  updatedAt: string
  emails: Email[]
  notes: Note[]
  activities: Activity[]
  tags: Tag[]
}

interface Tag {
  id: string
  name: string
  color: string
}

interface Email {
  id: string
  subject: string
  body: string
  status: string
  sentAt?: string
  openedAt?: string
  repliedAt?: string
  opens: number
  createdAt: string
}

interface Note {
  id: string
  content: string
  author: string
  createdAt: string
}

interface Activity {
  id: string
  type: string
  detail?: string
  createdAt: string
}

interface Props {
  leadId: string | null
  onClose: () => void
  onUpdate: () => void
}

type Tab = 'overview' | 'emails' | 'notes' | 'activity'

export function LeadDrawer({ leadId, onClose, onUpdate }: Props) {
  const [lead, setLead] = useState<Lead | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(false)

  // Tags state
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [leadTagIds, setLeadTagIds] = useState<Set<string>>(new Set())
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0])
  const [creatingTag, setCreatingTag] = useState(false)

  // Enrich state
  const [enriching, setEnriching] = useState(false)
  const [enriched, setEnriched] = useState(false)

  // Email generation state
  const [generating, setGenerating] = useState(false)
  const [generatedEmail, setGeneratedEmail] = useState<{ subject: string; body: string; subjectAlternatives: string[] } | null>(null)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailTone, setEmailTone] = useState<typeof TONES[number]>('confident')
  const [sending, setSending] = useState(false)
  const [showEmailCompose, setShowEmailCompose] = useState(false)

  // Notes state
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  const fetchLead = useCallback(async () => {
    if (!leadId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/leads/${leadId}`)
      const data = await res.json()
      setLead(data.lead)
      // Sync tag IDs from lead
      setLeadTagIds(new Set((data.lead?.tags || []).map((t: Tag) => t.id)))
    } finally {
      setLoading(false)
    }
  }, [leadId])

  const fetchAllTags = useCallback(async () => {
    const res = await fetch('/api/tags')
    const data = await res.json()
    setAllTags(data.tags || [])
  }, [])

  useEffect(() => {
    setTab('overview')
    setGeneratedEmail(null)
    setShowEmailCompose(false)
    setEnriched(false)
    setShowTagPicker(false)
    fetchLead()
    fetchAllTags()
  }, [leadId, fetchLead, fetchAllTags])

  const updateStatus = async (status: string) => {
    if (!lead) return
    await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    fetchLead()
    onUpdate()
  }

  const generateEmail = async () => {
    if (!lead) return
    setGenerating(true)
    setShowEmailCompose(true)
    setTab('emails')
    try {
      const res = await fetch(`/api/leads/${lead.id}/generate-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone: emailTone }),
      })
      const data = await res.json()
      setGeneratedEmail(data)
      setEmailSubject(data.subject)
      setEmailBody(data.body)
    } finally {
      setGenerating(false)
    }
  }

  const sendEmail = async () => {
    if (!lead || !emailSubject || !emailBody) return
    setSending(true)
    try {
      await fetch(`/api/leads/${lead.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: emailSubject, body: emailBody, tone: emailTone }),
      })
      setShowEmailCompose(false)
      setGeneratedEmail(null)
      fetchLead()
      onUpdate()
    } finally {
      setSending(false)
    }
  }

  const saveDraft = async () => {
    if (!lead || !emailSubject || !emailBody) return
    await fetch(`/api/leads/${lead.id}/emails`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: emailSubject, body: emailBody, tone: emailTone }),
    })
    setShowEmailCompose(false)
    setGeneratedEmail(null)
    fetchLead()
  }

  const addNote = async () => {
    if (!lead || !noteText.trim()) return
    setSavingNote(true)
    try {
      await fetch(`/api/leads/${lead.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteText }),
      })
      setNoteText('')
      fetchLead()
    } finally {
      setSavingNote(false)
    }
  }

  const enrich = async () => {
    if (!lead) return
    setEnriching(true)
    try {
      const res = await fetch(`/api/leads/${lead.id}/enrich`, { method: 'POST' })
      if (res.ok) {
        setEnriched(true)
        fetchLead()
        onUpdate()
      }
    } finally {
      setEnriching(false)
    }
  }

  const deleteLead = async () => {
    if (!lead || !confirm(`Delete ${lead.company}? This cannot be undone.`)) return
    await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' })
    onClose()
    onUpdate()
  }

  const toggleTag = async (tagId: string) => {
    if (!lead) return
    const next = new Set(leadTagIds)
    if (next.has(tagId)) next.delete(tagId)
    else next.add(tagId)
    setLeadTagIds(next)
    await fetch(`/api/leads/${lead.id}/tags`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagIds: Array.from(next) }),
    })
  }

  const createTag = async () => {
    if (!newTagName.trim()) return
    setCreatingTag(true)
    const res = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
    })
    const data = await res.json()
    if (res.ok) {
      setAllTags(prev => [...prev, data.tag].sort((a, b) => a.name.localeCompare(b.name)))
      setNewTagName('')
      // Auto-add the new tag to this lead
      if (lead) {
        const next = new Set(leadTagIds)
        next.add(data.tag.id)
        setLeadTagIds(next)
        await fetch(`/api/leads/${lead.id}/tags`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tagIds: Array.from(next) }),
        })
      }
    }
    setCreatingTag(false)
  }

  if (!leadId) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40 animate-fade-in" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[520px] bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col animate-slide-in">
        {loading || !lead ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <div className="w-6 h-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
              Loading…
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100">
              <div className="text-3xl mt-0.5">{lead.emoji || '🏢'}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-gray-900 truncate">{lead.company}</h2>
                  <ScoreBadge score={lead.score} />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <a href={`https://${lead.domain}`} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-gray-400 hover:text-indigo-600 transition-colors">
                    {lead.domain} ↗
                  </a>
                  <span className="text-gray-200">·</span>
                  <Badge status={lead.status} />
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={lead.status}
                  onChange={(e) => updateStatus(e.target.value)}
                  className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
                </select>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none px-1">×</button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 px-5 py-2.5 border-b border-gray-100 bg-gray-50">
              <select
                value={emailTone}
                onChange={(e) => setEmailTone(e.target.value as typeof TONES[number])}
                className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              >
                {TONES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
              <button
                onClick={generateEmail}
                disabled={generating}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded transition-colors disabled:opacity-60"
              >
                {generating ? (
                  <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                ) : '✦'}
                Generate Email
              </button>
              <button
                onClick={enrich}
                disabled={enriching || enriched}
                title="Re-run web intelligence: find verified email, LinkedIn, and latest marketing signals"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors disabled:opacity-60 ${
                  enriched
                    ? 'bg-green-50 text-green-600 border border-green-200'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
                }`}
              >
                {enriching ? (
                  <span className="w-3 h-3 border border-gray-400/40 border-t-gray-600 rounded-full animate-spin" />
                ) : enriched ? '✓' : '⚡'}
                {enriched ? 'Enriched' : 'Enrich'}
              </button>
              <button
                onClick={deleteLead}
                className="ml-auto text-xs text-gray-400 hover:text-red-500 px-2 py-1.5 transition-colors"
              >
                Delete
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-5">
              {(['overview', 'emails', 'notes', 'activity'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`py-2.5 px-3 text-sm mr-1 border-b-2 transition-colors ${
                    tab === t
                      ? 'border-indigo-500 text-indigo-600 font-medium'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                  {t === 'emails' && lead.emails.length > 0 && (
                    <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                      {lead.emails.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Overview */}
              {tab === 'overview' && (
                <div className="p-5 space-y-5">
                  {/* Tags */}
                  <Section title="Tags">
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {allTags.filter(t => leadTagIds.has(t.id)).map(tag => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: tag.color }}
                        >
                          {tag.name}
                          <button
                            onClick={() => toggleTag(tag.id)}
                            className="opacity-70 hover:opacity-100 ml-0.5 leading-none"
                          >×</button>
                        </span>
                      ))}
                      <div className="relative">
                        <button
                          onClick={() => setShowTagPicker(p => !p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-dashed border-gray-300 text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors"
                        >
                          + Tag
                        </button>
                        {showTagPicker && (
                          <div className="absolute left-0 top-8 z-20 bg-white border border-gray-200 rounded-xl shadow-xl w-56 p-3">
                            <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Tags</div>
                            <div className="space-y-0.5 max-h-36 overflow-y-auto mb-3">
                              {allTags.length === 0 && (
                                <div className="text-xs text-gray-400 py-1">No tags yet. Create one below.</div>
                              )}
                              {allTags.map(tag => (
                                <label key={tag.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={leadTagIds.has(tag.id)}
                                    onChange={() => toggleTag(tag.id)}
                                    className="accent-indigo-600"
                                  />
                                  <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: tag.color }}
                                  />
                                  <span className="text-sm text-gray-700 truncate">{tag.name}</span>
                                </label>
                              ))}
                            </div>
                            <div className="border-t border-gray-100 pt-2">
                              <div className="text-xs text-gray-400 mb-1.5">New tag</div>
                              <div className="flex gap-1.5 mb-2">
                                {TAG_COLORS.map(c => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => setNewTagColor(c)}
                                    className={`w-4 h-4 rounded-full transition-transform ${newTagColor === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-300' : ''}`}
                                    style={{ backgroundColor: c }}
                                  />
                                ))}
                              </div>
                              <div className="flex gap-1.5">
                                <input
                                  type="text"
                                  value={newTagName}
                                  onChange={e => setNewTagName(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && createTag()}
                                  placeholder="Tag name…"
                                  className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                />
                                <button
                                  onClick={createTag}
                                  disabled={!newTagName.trim() || creatingTag}
                                  className="px-2.5 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                                >
                                  {creatingTag ? '…' : 'Add'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Section>

                  <Section title="Company">
                    <Row label="Industry" value={lead.industry} />
                    <Row label="Size" value={lead.companySize} />
                    <Row label="Revenue" value={lead.revenue} />
                    <Row label="Geography" value={lead.geography} />
                    {lead.description && (
                      <p className="mt-2 text-sm text-gray-500 leading-relaxed">{lead.description}</p>
                    )}
                  </Section>

                  {(lead.contactName || lead.contactEmail) && (
                    <Section title="Decision Maker">
                      <Row label="Name" value={lead.contactName} />
                      <Row label="Role" value={lead.contactRole} />
                      <Row label="Email" value={lead.contactEmail} isEmail />
                      {lead.contactLinkedIn && (
                        <Row label="LinkedIn" value="View profile" isLink={lead.contactLinkedIn} />
                      )}
                    </Section>
                  )}

                  {lead.signals.length > 0 && (
                    <Section title="Marketing Signals">
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {lead.signals.map((s) => (
                          <span key={s} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-full font-medium">
                            {s}
                          </span>
                        ))}
                      </div>
                    </Section>
                  )}

                  {lead.whyFit && (
                    <Section title="Why BLKLIST Fits">
                      <p className="text-sm text-gray-600 leading-relaxed">{lead.whyFit}</p>
                    </Section>
                  )}
                </div>
              )}

              {/* Emails */}
              {tab === 'emails' && (
                <div className="p-5 space-y-4">
                  {/* Compose area */}
                  {showEmailCompose && (
                    <div className="border border-indigo-200 rounded-lg bg-indigo-50/30 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                          {generating ? 'Generating email…' : 'AI Draft'}
                        </span>
                        <button onClick={() => { setShowEmailCompose(false); setGeneratedEmail(null) }}
                          className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
                      </div>

                      {generating ? (
                        <div className="flex items-center gap-2 text-sm text-gray-400 py-6 justify-center">
                          <span className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                          Claude is writing your email…
                        </div>
                      ) : generatedEmail && (
                        <>
                          {/* Subject alternatives */}
                          <div className="mb-3">
                            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Subject line</label>
                            <div className="space-y-1">
                              {[generatedEmail.subject, ...generatedEmail.subjectAlternatives].map((s, i) => (
                                <label key={i} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="subject"
                                    checked={emailSubject === s}
                                    onChange={() => setEmailSubject(s)}
                                    className="accent-indigo-600"
                                  />
                                  <span className="text-sm text-gray-700">{s}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <label className="text-xs text-gray-500 font-medium mb-1 block">Email body</label>
                          <textarea
                            value={emailBody}
                            onChange={(e) => setEmailBody(e.target.value)}
                            rows={10}
                            className="w-full text-sm border border-gray-200 rounded p-3 focus:outline-none focus:ring-1 focus:ring-indigo-400 font-mono resize-none"
                          />

                          <div className="flex gap-2 mt-3">
                            <button onClick={sendEmail} disabled={sending || !lead.contactEmail}
                              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded transition-colors disabled:opacity-50">
                              {sending ? 'Sending…' : lead.contactEmail ? '↑ Send Email' : 'No email on file'}
                            </button>
                            <button onClick={saveDraft}
                              className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-sm rounded transition-colors text-gray-600">
                              Save Draft
                            </button>
                            <button onClick={generateEmail} disabled={generating}
                              className="px-3 py-2 text-sm text-gray-400 hover:text-indigo-600 transition-colors">
                              ↺
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Email history */}
                  {lead.emails.length === 0 && !showEmailCompose ? (
                    <div className="text-center py-12 text-gray-400">
                      <div className="text-3xl mb-2">✉</div>
                      <p className="text-sm">No emails yet. Click "Generate Email" to start.</p>
                    </div>
                  ) : (
                    lead.emails.map((email) => (
                      <EmailCard key={email.id} email={email} />
                    ))
                  )}
                </div>
              )}

              {/* Notes */}
              {tab === 'notes' && (
                <div className="p-5 space-y-4">
                  <div className="flex gap-2">
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Add a note about this lead…"
                      rows={3}
                      className="flex-1 text-sm border border-gray-200 rounded p-3 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
                    />
                    <button onClick={addNote} disabled={!noteText.trim() || savingNote}
                      className="self-end px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white text-sm rounded transition-colors disabled:opacity-40">
                      Add
                    </button>
                  </div>

                  {lead.notes.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">No notes yet.</div>
                  ) : (
                    lead.notes.map((note) => (
                      <div key={note.id} className="border border-gray-100 rounded-lg p-3 bg-white">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                        <div className="mt-2 text-xs text-gray-400">
                          {note.author} · {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Activity */}
              {tab === 'activity' && (
                <div className="p-5">
                  {lead.activities.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">No activity yet.</div>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-100" />
                      <div className="space-y-4">
                        {lead.activities.map((act) => (
                          <div key={act.id} className="flex gap-3 relative">
                            <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs shrink-0 z-10">
                              {ACTIVITY_ICON[act.type] || '·'}
                            </div>
                            <div className="pb-1">
                              <div className="text-sm text-gray-700">{ACTIVITY_LABEL[act.type] || act.type}</div>
                              {act.detail && <div className="text-xs text-gray-400 mt-0.5">{act.detail}</div>}
                              <div className="text-xs text-gray-400 mt-0.5">
                                {formatDistanceToNow(new Date(act.createdAt), { addSuffix: true })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function Row({ label, value, isEmail, isLink }: { label: string; value?: string | null; isEmail?: boolean; isLink?: string }) {
  if (!value && !isLink) return null
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs text-gray-400 w-20 shrink-0">{label}</span>
      {isEmail ? (
        <a href={`mailto:${value}`} className="text-sm text-indigo-600 hover:underline">{value}</a>
      ) : isLink ? (
        <a href={isLink} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline">{value}</a>
      ) : (
        <span className="text-sm text-gray-700">{value}</span>
      )}
    </div>
  )
}

function EmailCard({ email }: { email: Email }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="border border-gray-100 rounded-lg bg-white overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors">
        <div className="min-w-0">
          <div className="text-sm font-medium text-gray-800 truncate">{email.subject}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge status={email.status} />
            {email.opens > 0 && (
              <span className="text-xs text-gray-400">{email.opens} open{email.opens !== 1 ? 's' : ''}</span>
            )}
            <span className="text-xs text-gray-400">
              {formatDistanceToNow(new Date(email.sentAt || email.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>
        <span className="text-gray-400 text-sm ml-2">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 border-t border-gray-50">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed mt-2">{email.body}</pre>
        </div>
      )}
    </div>
  )
}

const ACTIVITY_ICON: Record<string, string> = {
  LEAD_CREATED: '✦',
  EMAIL_SENT: '↑',
  EMAIL_OPENED: '◎',
  EMAIL_REPLIED: '↩',
  STATUS_CHANGED: '⊡',
  NOTE_ADDED: '✎',
  MEETING_BOOKED: '◈',
  ENRICHED: '⚡',
}

const ACTIVITY_LABEL: Record<string, string> = {
  LEAD_CREATED: 'Lead added to CRM',
  EMAIL_SENT: 'Email sent',
  EMAIL_OPENED: 'Email opened',
  EMAIL_REPLIED: 'Replied to email',
  STATUS_CHANGED: 'Status updated',
  NOTE_ADDED: 'Note added',
  MEETING_BOOKED: 'Meeting booked',
  ENRICHED: 'Contact data enriched',
}
