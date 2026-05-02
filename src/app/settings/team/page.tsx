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

const ROLE_STYLES: Record<string, string> = {
  OWNER:  'bg-ink text-white',
  ADMIN:  'bg-violet-100 text-violet-700',
  MEMBER: 'bg-subtle text-muted',
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
    setInviting(true); setInviteError('')
    const res = await fetch('/api/team/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    })
    const data = await res.json()
    if (!res.ok) setInviteError(data.error || 'Failed to send invite')
    else {
      setInviteEmail(''); setInviteSent(true)
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
    setEditingName(false); refresh()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="max-w-[680px] mx-auto px-6 sm:px-8 py-10 lg:py-14 space-y-4">

      <div className="mb-8">
        <h1 className="text-[24px] font-semibold tracking-tighter text-ink">Team</h1>
        <p className="text-muted text-[13px] mt-1">Manage members and invite collaborators.</p>
      </div>

      {/* Team name */}
      <Card title="Team name">
        <div className="flex items-center gap-3">
          {editingName ? (
            <>
              <input
                autoFocus
                type="text"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveTeamName()
                  if (e.key === 'Escape') { setEditingName(false); setTeamName(team?.name || '') }
                }}
                className="flex-1 text-[13px] border border-line rounded-lg px-3.5 h-10 bg-surface focus:border-accent focus:ring-2 focus:ring-accent/15"
              />
              <button onClick={saveTeamName} className="h-10 px-4 bg-ink text-white text-[12.5px] font-semibold rounded-lg hover:bg-zinc-800">
                Save
              </button>
              <button onClick={() => { setEditingName(false); setTeamName(team?.name || '') }} className="h-10 px-3 text-[12.5px] text-muted hover:text-ink">
                Cancel
              </button>
            </>
          ) : (
            <>
              <span className="flex-1 text-[14px] font-medium text-ink">{team?.name}</span>
              {canManage && (
                <button onClick={() => setEditingName(true)} className="text-[12.5px] text-muted hover:text-ink font-medium">
                  Edit
                </button>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Members */}
      <Card title={`Members · ${team?.members.length ?? 0}`} pad={false}>
        <ul>
          {team?.members.map((m, i) => (
            <motion.li
              key={m.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-3 px-6 h-[60px] border-b border-line last:border-b-0"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-[11px] font-semibold shrink-0">
                {(m.user.name || m.user.email)[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-ink truncate">{m.user.name || m.user.email}</div>
                {m.user.name && <div className="text-[11.5px] text-faint truncate">{m.user.email}</div>}
              </div>
              <span className={`px-2 h-6 inline-flex items-center text-[11px] font-medium rounded-md ${ROLE_STYLES[m.role] || 'bg-subtle text-muted'}`}>
                {m.role.charAt(0) + m.role.slice(1).toLowerCase()}
              </span>
            </motion.li>
          ))}
        </ul>
      </Card>

      {/* Pending invites */}
      <AnimatePresence>
        {(team?.invites.length ?? 0) > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card title="Pending invites" pad={false}>
              <ul>
                {team?.invites.map((inv) => (
                  <li key={inv.id} className="flex items-center gap-3 px-6 h-[52px] border-b border-line last:border-b-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-ink truncate">{inv.email}</div>
                      <div className="text-[11px] text-faint">
                        Expires {formatDistanceToNow(new Date(inv.expiresAt), { addSuffix: true })}
                      </div>
                    </div>
                    <span className={`px-2 h-6 inline-flex items-center text-[11px] font-medium rounded-md mr-2 ${ROLE_STYLES[inv.role] || 'bg-subtle text-muted'}`}>
                      {inv.role.charAt(0) + inv.role.slice(1).toLowerCase()}
                    </span>
                    {canManage && (
                      <button onClick={() => cancelInvite(inv.id)} className="text-[12px] text-muted hover:text-red-600 font-medium">
                        Cancel
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invite form */}
      {canManage && (
        <Card title="Invite a member">
          <form onSubmit={handleInvite} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={e => { setInviteEmail(e.target.value); setInviteError('') }}
                placeholder="colleague@company.com"
                required
                className="flex-1 text-[13px] border border-line rounded-lg px-3.5 h-10 bg-surface focus:border-accent focus:ring-2 focus:ring-accent/15"
              />
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as 'MEMBER' | 'ADMIN')}
                className="text-[13px] border border-line rounded-lg px-3 h-10 bg-surface focus:border-accent focus:ring-2 focus:ring-accent/15"
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            {inviteError && <p className="text-[12px] text-red-500">{inviteError}</p>}
            <motion.button
              type="submit"
              disabled={inviting || !inviteEmail.trim()}
              whileTap={{ scale: 0.97 }}
              className={`w-full h-10 text-[13px] font-semibold rounded-lg ${
                inviteSent
                  ? 'bg-emerald-600 text-white'
                  : 'bg-ink text-white hover:bg-zinc-800 disabled:opacity-40'
              }`}
            >
              {inviteSent ? '✓ Invite sent' : inviting ? 'Sending…' : 'Send invite'}
            </motion.button>
          </form>
        </Card>
      )}
    </div>
  )
}

function Card({ title, children, pad = true }: { title: string; children: React.ReactNode; pad?: boolean }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="bg-surface border border-line rounded-xl overflow-hidden"
    >
      <div className={`flex items-center px-6 ${pad ? 'pt-5' : 'h-12 border-b border-line'}`}>
        <h2 className="text-[13px] font-semibold text-ink tracking-tight">{title}</h2>
      </div>
      <div className={pad ? 'px-6 pt-3 pb-6' : ''}>{children}</div>
    </motion.section>
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
