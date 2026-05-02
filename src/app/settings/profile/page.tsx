'use client'

import { useState, useEffect, Suspense } from 'react'
import { signOut } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

const INDUSTRIES = ['eCommerce', 'Fashion & Apparel', 'DTC Brands', 'SaaS', 'Gaming', 'Beauty & Skincare', 'Health & Wellness', 'Fintech', 'Travel', 'Media & Entertainment', 'Luxury', 'Sports & Fitness']
const GEOGRAPHIES = ['United States', 'United Kingdom', 'Europe', 'Global', 'APAC', 'North America', 'Middle East', 'Latin America']
const SIZES = ['Startup (1-50)', 'SMB (51-200)', 'Mid-market (201-1000)', 'Enterprise (1000+)']

interface UserProfile {
  id: string
  name: string | null
  email: string
  jobTitle: string | null
  phone: string | null
  businessName: string | null
  businessDescription: string | null
  pitchAngle: string | null
  targetIndustries: string[]
  targetGeographies: string[]
  targetSizes: string[]
  gmailConnected: boolean
  gmailEmail: string | null
}

function ProfileInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [gmailLoading, setGmailLoading] = useState(false)
  const [banner, setBanner] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null)

  const [form, setForm] = useState({
    name: '', jobTitle: '', phone: '',
    businessName: '', businessDescription: '', pitchAngle: '',
    targetIndustries: [] as string[], targetGeographies: [] as string[], targetSizes: [] as string[],
  })

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(({ user }) => {
      setProfile(user)
      setForm({
        name: user.name || '', jobTitle: user.jobTitle || '', phone: user.phone || '',
        businessName: user.businessName || '', businessDescription: user.businessDescription || '', pitchAngle: user.pitchAngle || '',
        targetIndustries: user.targetIndustries || [], targetGeographies: user.targetGeographies || [], targetSizes: user.targetSizes || [],
      })
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')
    if (connected === 'gmail') {
      setBanner({ kind: 'success', msg: 'Gmail connected. Outreach emails will now send from your Gmail account.' })
      fetch('/api/dashboard').then(r => r.json()).then(({ user }) => setProfile(user))
      router.replace('/settings/profile')
    } else if (error === 'gmail_denied') {
      setBanner({ kind: 'error', msg: 'Gmail connection cancelled.' })
      router.replace('/settings/profile')
    } else if (error === 'gmail_token_failed' || error === 'gmail_failed') {
      setBanner({ kind: 'error', msg: 'Could not connect Gmail. Please try again.' })
      router.replace('/settings/profile')
    } else if (error === 'google_not_configured') {
      setBanner({ kind: 'error', msg: 'Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local.' })
      router.replace('/settings/profile')
    }
    if (banner) setTimeout(() => setBanner(null), 6000)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setSaved(false)
    const res = await fetch('/api/dashboard', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2200) }
    setSaving(false)
  }

  const toggle = (key: 'targetIndustries' | 'targetGeographies' | 'targetSizes', val: string) => {
    setForm(f => ({ ...f, [key]: f[key].includes(val) ? f[key].filter(x => x !== val) : [...f[key], val] }))
  }

  const connectGmail = () => { setGmailLoading(true); window.location.href = '/api/gmail/connect' }
  const disconnectGmail = async () => {
    setGmailLoading(true)
    await fetch('/api/gmail/disconnect', { method: 'POST' })
    setProfile(p => p ? { ...p, gmailConnected: false, gmailEmail: null } : p)
    setGmailLoading(false)
    setBanner({ kind: 'success', msg: 'Gmail disconnected.' })
    setTimeout(() => setBanner(null), 3000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    )
  }

  const initials = (profile?.name || profile?.email || '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="max-w-[1100px] mx-auto px-6 sm:px-10 py-10 lg:py-12">

      {/* Banner */}
      <AnimatePresence>
        {banner && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className={`mb-6 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[12.5px] font-medium ${
              banner.kind === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                : 'bg-red-50 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/20 text-red-600 dark:text-red-400'
            }`}
          >
            <span className="text-[14px]">{banner.kind === 'success' ? '✓' : '!'}</span>
            {banner.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Profile header card ── */}
      <motion.div
        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className="bg-surface border border-line rounded-2xl p-6 sm:p-8 mb-5 flex items-start gap-5"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-[20px] font-semibold shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-[22px] font-semibold tracking-tight text-ink">{profile?.name || 'Your name'}</h1>
          <p className="text-muted text-[13px] mt-0.5">{profile?.email}</p>
          {form.jobTitle && form.businessName && (
            <p className="text-faint text-[12.5px] mt-1.5">{form.jobTitle} · {form.businessName}</p>
          )}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-[12.5px] font-medium text-muted hover:text-ink h-8 px-3 border border-line rounded-lg hover:bg-subtle"
        >
          Sign out
        </button>
      </motion.div>

      <form onSubmit={handleSave} className="space-y-5">

        {/* ── 2-column grid: Identity + Gmail ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card title="Identity" desc="Used in your outreach signatures" delay={0.05}>
            <div className="space-y-3">
              <Field label="Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Alex Johnson" />
              <DisabledField label="Email" value={profile?.email || ''} />
              <Field label="Job title" value={form.jobTitle} onChange={v => setForm(f => ({ ...f, jobTitle: v }))} placeholder="Head of Growth" />
              <Field label="Phone" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="+1 (555) 000-0000" />
            </div>
          </Card>

          <Card title="Gmail" desc="Send from your inbox automatically" delay={0.1}>
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
                  profile?.gmailConnected ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/60 dark:border-emerald-500/20' : 'bg-subtle border-line'
                }`}>
                  <GmailIcon connected={!!profile?.gmailConnected} />
                </div>
                <div className="flex-1 min-w-0">
                  {profile?.gmailConnected ? (
                    <>
                      <div className="text-[13px] font-medium text-ink flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        Connected
                      </div>
                      <div className="text-[11.5px] text-faint mt-0.5 truncate">{profile.gmailEmail}</div>
                    </>
                  ) : (
                    <>
                      <div className="text-[13px] font-medium text-ink">Not connected</div>
                      <div className="text-[11.5px] text-faint mt-0.5">Send from your Gmail inbox</div>
                    </>
                  )}
                </div>
              </div>

              {profile?.gmailConnected ? (
                <button
                  type="button"
                  onClick={disconnectGmail}
                  disabled={gmailLoading}
                  className="h-9 text-[12.5px] font-medium text-muted hover:text-red-600 border border-line hover:border-red-300 rounded-lg disabled:opacity-50"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  type="button"
                  onClick={connectGmail}
                  disabled={gmailLoading}
                  className="h-9 text-[12.5px] font-semibold text-white dark:text-black bg-ink rounded-lg hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {gmailLoading ? <Spinner small /> : null}
                  Connect Gmail
                </button>
              )}
              {!profile?.gmailConnected && (
                <p className="mt-3 text-[11px] text-faint leading-relaxed">
                  Only requests <span className="text-muted font-medium">send</span> permission. Your inbox is never read.
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* ── Business (full width) ── */}
        <Card title="Business" desc="Help AI understand what you offer" delay={0.15}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <Field label="Business / Agency name" value={form.businessName} onChange={v => setForm(f => ({ ...f, businessName: v }))} placeholder="BLKLIST Creative" />
            <Field label="Pitch angle" value={form.pitchAngle} onChange={v => setForm(f => ({ ...f, pitchAngle: v }))} placeholder="30%+ CTR through high-converting creative" />
          </div>
          <div className="mt-3.5">
            <label className="text-[11.5px] text-muted font-medium block mb-1.5 tracking-tight">What does your business do?</label>
            <textarea
              value={form.businessDescription}
              onChange={e => setForm(f => ({ ...f, businessDescription: e.target.value }))}
              rows={3}
              placeholder="We're a performance creative agency producing social ads and video content for DTC brands…"
              className="w-full text-[13px] border border-line rounded-lg px-3.5 py-2.5 bg-surface text-ink focus:border-accent focus:ring-2 focus:ring-accent/15 resize-none"
            />
          </div>
        </Card>

        {/* ── Target criteria (full width) ── */}
        <Card title="Ideal lead criteria" desc="AI prioritises these in discovery" delay={0.2}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <ChipGroup label="Industries"  options={INDUSTRIES}  selected={form.targetIndustries}  onToggle={(v) => toggle('targetIndustries', v)} />
            <ChipGroup label="Geographies" options={GEOGRAPHIES} selected={form.targetGeographies} onToggle={(v) => toggle('targetGeographies', v)} />
            <ChipGroup label="Sizes"       options={SIZES}       selected={form.targetSizes}       onToggle={(v) => toggle('targetSizes', v)} />
          </div>
        </Card>

        {/* Save bar */}
        <div className="flex items-center justify-between pt-2 sticky bottom-4 z-10">
          <button
            type="button"
            onClick={() => router.push('/leads')}
            className="text-[12.5px] font-medium text-muted hover:text-ink"
          >
            ← Back to leads
          </button>
          <motion.button
            type="submit"
            disabled={saving}
            whileTap={{ scale: 0.97 }}
            className={`h-10 px-5 text-[13px] font-semibold rounded-lg shadow-card ${
              saved
                ? 'bg-emerald-600 text-white'
                : 'bg-ink text-white dark:text-black hover:opacity-90 disabled:opacity-50'
            }`}
          >
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save changes'}
          </motion.button>
        </div>
      </form>
    </div>
  )
}

export default function SettingsProfilePage() {
  return (
    <Suspense>
      <ProfileInner />
    </Suspense>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Card({ title, desc, children, delay = 0 }: { title: string; desc?: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.16, 1, 0.3, 1] }}
      className="bg-surface border border-line rounded-2xl p-6"
    >
      <div className="mb-5">
        <h2 className="text-[13px] font-semibold text-ink tracking-tight">{title}</h2>
        {desc && <p className="text-[12px] text-faint mt-0.5">{desc}</p>}
      </div>
      {children}
    </motion.section>
  )
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className="text-[11.5px] text-muted font-medium block mb-1.5 tracking-tight">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-[13px] border border-line rounded-lg px-3.5 h-10 bg-surface text-ink focus:border-accent focus:ring-2 focus:ring-accent/15"
      />
    </div>
  )
}

function DisabledField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-[11.5px] text-muted font-medium block mb-1.5 tracking-tight">{label}</label>
      <input
        type="text"
        value={value}
        disabled
        className="w-full text-[13px] border border-line rounded-lg px-3.5 h-10 bg-subtle text-faint cursor-not-allowed"
      />
    </div>
  )
}

function ChipGroup({ label, options, selected, onToggle }: {
  label: string; options: string[]; selected: string[]; onToggle: (v: string) => void
}) {
  return (
    <div>
      <label className="text-[11.5px] text-muted font-medium block mb-2 tracking-tight">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => {
          const on = selected.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className={`px-2.5 h-7 text-[12px] font-medium rounded-md border ${
                on
                  ? 'bg-ink text-white dark:text-black border-ink'
                  : 'bg-surface border-line text-muted hover:text-ink hover:border-zinc-300 dark:hover:border-zinc-600'
              }`}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Spinner({ small = false }: { small?: boolean }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      className={`${small ? 'w-3 h-3' : 'w-5 h-5'} border-2 border-line border-t-ink rounded-full`}
    />
  )
}

function GmailIcon({ connected }: { connected: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke={connected ? '#10b981' : 'currentColor'} strokeOpacity={connected ? 1 : 0.5} strokeWidth="1.5"/>
      <path d="M3 8l9 6 9-6" stroke={connected ? '#10b981' : 'currentColor'} strokeOpacity={connected ? 1 : 0.5} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
