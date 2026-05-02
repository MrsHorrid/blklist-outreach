'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'

interface TeamMember {
  id: string
  role: string
  user: { id: string; name: string | null; email: string; jobTitle: string | null }
}

interface TeamInvite {
  id: string
  email: string
  role: string
  expiresAt: string
}

interface Team {
  id: string
  name: string
  members: TeamMember[]
  invites: TeamInvite[]
}

const ROLE_PILL: Record<string, string> = {
  OWNER: 'bg-indigo-50 text-indigo-600',
  ADMIN: 'bg-violet-50 text-violet-600',
  MEMBER: 'bg-gray-100 text-gray-500',
}

export default function TeamPage() {
  const { data: session } = useSession()
  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'MEMBER' | 'ADMIN'>('MEMBER')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSent, setInviteSent] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [teamName, setTeamName] = useState('')

  const refresh = () =>
    fetch('/api/team').then(r => r.json()).then(({ team }) => {
      setTeam(team)
      setTeamName(team?.name || '')
    })

  useEffect(() => { refresh().finally(() => setLoading(false)) }, [])

  const myMember = team?.members.find(m => m.user.id === session?.user?.id)
  const canManage = myMember?.role === 'OWNER' || myMember?.role === 'ADMIN'

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteError('')
    const res = await fetch('/api/team/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    })
    const data = await res.json()
    if (!res.ok) {
      setInviteError(data.error || 'Failed to send invite')
    } else {
      setInviteEmail('')
      setInviteSent(true)
      setTimeout(() => setInviteSent(false), 3000)
      refresh()
    }
    setInviting(false)
  }

  const cancelInvite = async (inviteId: string) => {
    await fetch('/api/team/invite', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteId }),
    })
    refresh()
  }

  const saveTeamName = async () => {
    if (!teamName.trim() || teamName === team?.name) { setEditingName(false); return }
    await fetch('/api/team', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: teamName }),
    })
    setEditingName(false)
    refresh()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-500 rounded-full"
        />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-5">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Team</h1>
        <p className="text-gray-400 text-sm mt-1">Manage your team members and invite collaborators.</p>
      </div>

      {/* Team name */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 text-sm mb-4">Team name</h2>
        <div className="flex items-center gap-3">
          {editingName ? (
            <>
              <input
                autoFocus
                type="text"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveTeamName(); if (e.key === 'Escape') { setEditingName(false); setTeamName(team?.name || '') } }}
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400"
              />
              <button onClick={saveTeamName} className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
                Save
              </button>
              <button onClick={() => { setEditingName(false); setTeamName(team?.name || '') }} className="px-3 py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
                Cancel
              </button>
            </>
          ) : (
            <>
              <span className="flex-1 text-sm font-medium text-gray-900">{team?.name}</span>
              {canManage && (
                <button onClick={() => setEditingName(true)} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
                  Edit
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Members */}
      <div className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Members <span className="text-gray-400 font-normal">({team?.members.length})</span></h2>
        </div>
        <div className="divide-y divide-gray-50">
          {team?.members.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 px-6 py-4"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold shrink-0">
                {(m.user.name || m.user.email)[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{m.user.name || m.user.email}</div>
                {m.user.name && <div className="text-xs text-gray-400 truncate">{m.user.email}</div>}
                {m.user.jobTitle && <div className="text-xs text-gray-300 truncate">{m.user.jobTitle}</div>}
              </div>
              <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full ${ROLE_PILL[m.role] || 'bg-gray-100 text-gray-500'}`}>
                {m.role.charAt(0) + m.role.slice(1).toLowerCase()}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Pending invites */}
      <AnimatePresence>
        {(team?.invites.length ?? 0) > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-sm"
          >
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm">Pending Invites</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {team?.invites.map((inv) => (
                <div key={inv.id} className="flex items-center gap-3 px-6 py-3.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-700 truncate">{inv.email}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      Expires {formatDistanceToNow(new Date(inv.expiresAt), { addSuffix: true })}
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full mr-2 ${ROLE_PILL[inv.role] || 'bg-gray-100 text-gray-500'}`}>
                    {inv.role.charAt(0) + inv.role.slice(1).toLowerCase()}
                  </span>
                  {canManage && (
                    <button
                      onClick={() => cancelInvite(inv.id)}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invite form */}
      {canManage && (
        <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 text-sm mb-4">Invite someone</h2>
          <form onSubmit={handleInvite} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={e => { setInviteEmail(e.target.value); setInviteError('') }}
                placeholder="colleague@company.com"
                required
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 transition-colors"
              />
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as 'MEMBER' | 'ADMIN')}
                className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 bg-white transition-colors"
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            {inviteError && <p className="text-xs text-red-500">{inviteError}</p>}
            <motion.button
              type="submit"
              disabled={inviting || !inviteEmail.trim()}
              whileTap={{ scale: 0.97 }}
              className={`w-full py-2.5 text-sm font-semibold rounded-xl transition-all duration-150 shadow-sm ${
                inviteSent
                  ? 'bg-emerald-600 text-white shadow-emerald-200'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 disabled:opacity-40'
              }`}
            >
              {inviteSent ? '✓ Invite sent' : inviting ? 'Sending…' : 'Send invite'}
            </motion.button>
          </form>
        </div>
      )}
    </div>
  )
}
