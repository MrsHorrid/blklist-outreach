'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/Badge'
import { ScoreBadge } from '@/components/ui/ScoreBadge'
import { LeadDrawer } from '@/components/leads/LeadDrawer'

const COLUMNS = [
  { id: 'DISCOVERED',   label: 'Discovered',   color: 'bg-gray-100' },
  { id: 'CONTACTED',    label: 'Contacted',    color: 'bg-blue-50' },
  { id: 'OPENED',       label: 'Opened',       color: 'bg-amber-50' },
  { id: 'REPLIED',      label: 'Replied',      color: 'bg-violet-50' },
  { id: 'MEETING',      label: 'Meeting',      color: 'bg-green-50' },
  { id: 'CLOSED',       label: 'Closed',       color: 'bg-emerald-50' },
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
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, status } : l))
  }

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('leadId', leadId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggingId(leadId)
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    setOverColumn(null)
  }

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverColumn(columnId)
  }

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    const leadId = e.dataTransfer.getData('leadId')
    const lead = leads.find((l) => l.id === leadId)
    if (lead && lead.status !== columnId) {
      updateStatus(leadId, columnId)
    }
    setDraggingId(null)
    setOverColumn(null)
  }

  const columnLeads = (status: string) => leads.filter((l) => l.status === status)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Pipeline</h1>
          <p className="text-sm text-gray-400">Drag cards to update status</p>
        </div>
        <div className="text-sm text-gray-400">{leads.length} total leads</div>
      </div>

      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-3 h-full min-w-max">
          {COLUMNS.map((col) => {
            const colLeads = columnLeads(col.id)
            const isOver = overColumn === col.id
            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDrop={(e) => handleDrop(e, col.id)}
                onDragLeave={() => setOverColumn(null)}
                className={`flex flex-col w-[220px] rounded-xl border-2 transition-all ${
                  isOver ? 'border-indigo-400 bg-indigo-50' : 'border-transparent bg-gray-100/50'
                }`}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Badge status={col.id} />
                  </div>
                  <span className="text-xs font-semibold text-gray-400">{colLeads.length}</span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2 min-h-[200px]">
                  {colLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setSelectedId(lead.id)}
                      className={`bg-white border border-gray-200 rounded-lg p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md hover:border-indigo-300 transition-all ${
                        draggingId === lead.id ? 'opacity-40' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-base">{lead.emoji || '🏢'}</span>
                        <ScoreBadge score={lead.score} />
                      </div>
                      <div className="font-medium text-sm text-gray-800 leading-snug">{lead.company}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{lead.industry}</div>
                      {lead.contactName && (
                        <div className="text-xs text-gray-400 mt-1.5 pt-1.5 border-t border-gray-50">
                          {lead.contactName}
                        </div>
                      )}
                    </div>
                  ))}

                  {colLeads.length === 0 && (
                    <div className={`border-2 border-dashed rounded-lg p-4 text-center text-xs text-gray-300 transition-colors ${
                      isOver ? 'border-indigo-300 text-indigo-400' : 'border-gray-200'
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

      <LeadDrawer
        leadId={selectedId}
        onClose={() => setSelectedId(null)}
        onUpdate={fetchLeads}
      />
    </div>
  )
}
