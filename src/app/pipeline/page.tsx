'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ScoreBadge } from '@/components/ui/ScoreBadge'
import { LeadDrawer } from '@/components/leads/LeadDrawer'

const COLUMNS = [
  { id: 'DISCOVERED', label: 'Discovered', dot: 'bg-zinc-400' },
  { id: 'CONTACTED',  label: 'Contacted',  dot: 'bg-sky-500' },
  { id: 'OPENED',     label: 'Opened',     dot: 'bg-amber-500' },
  { id: 'REPLIED',    label: 'Replied',    dot: 'bg-violet-500' },
  { id: 'MEETING',    label: 'Meeting',    dot: 'bg-emerald-500' },
  { id: 'CLOSED',     label: 'Closed',     dot: 'bg-emerald-600' },
]

interface Lead {
  id: string
  company: string
  domain: string
  emoji?: string
  industry: string
  status: string
  score: number
  contactName?: string
  updatedAt: string
}

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overColumn, setOverColumn] = useState<string | null>(null)

  const fetchLeads = useCallback(async () => {
    const res = await fetch('/api/leads?limit=200')
    const data = await res.json()
    setLeads(data.leads || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  const updateStatus = async (leadId: string, status: string) => {
    await fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status } : l))
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('leadId', id)
    e.dataTransfer.effectAllowed = 'move'
    setDraggingId(id)
  }

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverColumn(colId)
  }

  const handleDrop = (e: React.DragEvent, colId: string) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('leadId')
    const lead = leads.find(l => l.id === id)
    if (lead && lead.status !== colId) updateStatus(id, colId)
    setDraggingId(null)
    setOverColumn(null)
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
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 lg:px-8 h-16 border-b border-line bg-canvas/80 backdrop-blur-md sticky top-0 z-10">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight text-ink">Pipeline</h1>
          <p className="text-[12px] text-faint">Drag cards to update status</p>
        </div>
        <div className="text-[12.5px] text-muted">{leads.length} leads</div>
      </div>

      <div className="flex-1 overflow-x-auto p-5">
        <div className="flex gap-3 h-full min-w-max">
          {COLUMNS.map((col) => {
            const colLeads = leads.filter(l => l.status === col.id)
            const isOver = overColumn === col.id
            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDrop={(e) => handleDrop(e, col.id)}
                onDragLeave={() => setOverColumn(null)}
                className={`flex flex-col w-[260px] rounded-xl border ${
                  isOver ? 'border-accent bg-accent/[0.04]' : 'border-line bg-surface'
                }`}
              >
                <div className="flex items-center justify-between px-3.5 h-11 border-b border-line">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />
                    <span className="text-[12.5px] font-semibold text-ink tracking-tight">{col.label}</span>
                  </div>
                  <span className="text-[11.5px] font-medium text-faint tabular-nums">{colLeads.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto px-2.5 py-2.5 space-y-2 min-h-[200px]">
                  {colLeads.map((lead) => (
                    <motion.div
                      key={lead.id}
                      layout
                      draggable
                      onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, lead.id)}
                      onDragEnd={() => { setDraggingId(null); setOverColumn(null) }}
                      onClick={() => setSelectedId(lead.id)}
                      whileHover={{ y: -1 }}
                      className={`bg-canvas border border-line rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-zinc-300 ${
                        draggingId === lead.id ? 'opacity-40' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-base">{lead.emoji || '🏢'}</span>
                        <ScoreBadge score={lead.score} />
                      </div>
                      <div className="font-medium text-[12.5px] text-ink leading-snug">{lead.company}</div>
                      <div className="text-[11.5px] text-faint mt-0.5">{lead.industry}</div>
                      {lead.contactName && (
                        <div className="text-[11.5px] text-faint mt-2 pt-2 border-t border-line">
                          {lead.contactName}
                        </div>
                      )}
                    </motion.div>
                  ))}
                  {colLeads.length === 0 && (
                    <div className={`border border-dashed rounded-lg py-4 text-center text-[11.5px] ${
                      isOver ? 'border-accent text-accent' : 'border-line text-faint'
                    }`}>
                      {isOver ? 'Drop here' : 'No leads'}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <LeadDrawer leadId={selectedId} onClose={() => setSelectedId(null)} onUpdate={fetchLeads} />
    </div>
  )
}
