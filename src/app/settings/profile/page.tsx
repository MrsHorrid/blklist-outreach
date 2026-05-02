'use client'

import { useState, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Suspense } from 'react'

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

function ProfilePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [gmailLoading, setGmailLoading] = useState(false)
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const [form, setForm] = useState({
    name: '',
    jobTitle: '',
    phone: '',
    businessName: '',
    businessDescription: '',
    pitchAngle: '',
    targetIndustries: [] as string[],
    targetGeographies: [] as string[],
    targetSizes: [] as string[],
  })

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(({ user }) => {
        setProfile(user)
        setForm({
          name: user.name || '',
          jobTitle: user.jobTitle || '',
          phone: user.phone || '',
          businessName: user.businessName || '',
          businessDescription: user.businessDescription || '',
          pitchAngle: user.pitchAngle || '',
          targetIndustries: user.targetIndustries || [],
          targetGeographies: user.targetGeographies || [],
          targetSizes: user.targetSizes || [],
        })
      })
      .finally(() => setLoading(false))
  }, [])

  // Handle OAuth return params
  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')
    if (connected === 'gmail') {
      setBanner({ type: 'success', msg: 'Gmail connected successfully! Emails will now send from your Gmail account.' })
      // Refresh profile to show new Gmail status
      fetch('/api/dashboard').then(r => r.json()).then(({ user }) => setProfile(user))
      router.replace('/settings/profile')
    } else if (error === 'gmail_denied') {
      setBanner({ type: 'error', msg: 'Gmail connection was cancelled.' })
      router.replace('/settings/profile')
    } else if (error === 'gmail_token_failed' || error === 'gmail_failed') {
      setBanner({ type: 'error', msg: 'Could not connect Gmail. Please try again.' })
      router.replace('/settings/profile')
    } else if (error === 'google_not_configured') {
      setBanner({ type: 'error', msg: 'Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local.' })
      router.replace('/settings/profile')
    }
    if (banner) setTimeout(() => setBanner(null), 6000)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    const res = await fetch('/api/dashboard', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
    setSaving(false)
  }

  const toggleMulti = (key: 'targetIndustries' | 'targetGeographies' | 'targetSizes', val: string) => {
    setForm(f => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter(x => x !== val) : [...f[key], val],
    }))
  }

  const handleGmailConnect = () => {
    setGmailLoading(true)
    window.location.href = '/api/gmail/connect'
  }

  const handleGmailDisconnect = async () => {
    setGmailLoading(true)
    await fetch('/api/gmail/disconnect', { method: 'POST' })
    setProfile(p => p ? { ...p, gmailConnected: false, gmailEmail: null } : p)
    setGmailLoading(false)
    setBanner({ type: 'success', msg: 'Gmail disconnected.' })
    setTimeout(() => setBanner(null), 4000)
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
    <div className="max-w-2xl mx-auto px-6 py-8">

      {/* Banner */}
      <AnimatePresence>
        {banner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`mb-5 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
              banner.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                : 'bg-red-50 border border-red-200 text-red-600'
            }`}
          >
            <span>{banner.type === 'success' ? '✓' : '!'}</span>
            {banner.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Profile</h1>
          <p className="text-gray-400 text-sm mt-1">
            AI uses this to find and personalise outreach for your best-fit leads.
          </p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors px-3 py-1.5 border border-gray-200 rounded-lg"
        >
          Sign out
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-5">

        {/* Identity */}
        <Card title="Identity" subtitle="Used in your outreach email signatures">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Your name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Alex Johnson" />
            <div>
              <label className="text-xs text-gray-400 font-medium block mb-1.5">Email</label>
              <input
                type="text"
                value={profile?.email || ''}
                disabled
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 text-gray-400 cursor-not-allowed"
              />
            </div>
            <Field label="Job title" value={form.jobTitle} onChange={v => setForm(f => ({ ...f, jobTitle: v }))} placeholder="Head of Growth" />
            <Field label="Phone (optional)" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="+1 (555) 000-0000" />
          </div>
          {(form.name || form.jobTitle) && (
            <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-[11px] text-gray-400 mb-1.5 font-semibold uppercase tracking-wider">Sign-off preview</p>
              <p className="text-sm text-gray-700 whitespace-pre-line font-mono text-xs leading-relaxed">
                {[
                  form.name || 'Your Name',
                  [form.jobTitle, form.businessName].filter(Boolean).join(' @ ') || 'Your Title @ Your Company',
                  form.phone,
                ].filter(Boolean).join('\n')}
              </p>
            </div>
          )}
        </Card>

        {/* Business */}
        <Card title="Your Business" subtitle="Help AI understand what you offer">
          <Field
            label="Business / Agency name"
            value={form.businessName}
            onChange={v => setForm(f => ({ ...f, businessName: v }))}
            placeholder="BLKLIST Creative Agency"
          />
          <div className="mt-4">
            <label className="text-xs text-gray-400 font-medium block mb-1.5">What does your business do?</label>
            <textarea
              value={form.businessDescription}
              onChange={e => setForm(f => ({ ...f, businessDescription: e.target.value }))}
              rows={3}
              placeholder="We're a performance creative agency that produces social ads and video content for DTC brands…"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 resize-none transition-colors"
            />
          </div>
          <div className="mt-4">
            <label className="text-xs text-gray-400 font-medium block mb-1.5">
              Pitch angle <span className="text-gray-300">(used in AI emails)</span>
            </label>
            <input
              type="text"
              value={form.pitchAngle}
              onChange={e => setForm(f => ({ ...f, pitchAngle: e.target.value }))}
              placeholder="We help premium brands achieve 30%+ CTR through high-converting creative"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 transition-colors"
            />
          </div>
        </Card>

        {/* Target Criteria */}
        <Card title="Ideal Lead Criteria" subtitle="AI will prioritise these in discovery">
          <div className="space-y-5">
            {([
              { key: 'targetIndustries' as const, label: 'Target industries', opts: INDUSTRIES },
              { key: 'targetGeographies' as const, label: 'Target geographies', opts: GEOGRAPHIES },
              { key: 'targetSizes' as const, label: 'Company sizes', opts: SIZES },
            ]).map(({ key, label, opts }) => (
              <div key={key}>
                <label className="text-xs text-gray-400 font-medium block mb-2">{label}</label>
                <div className="flex flex-wrap gap-1.5">
                  {opts.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleMulti(key, opt)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-all duration-100 ${
                        form[key].includes(opt)
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
                          : 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 bg-white'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Gmail Integration */}
        <Card title="Gmail Integration" subtitle="Send outreach emails directly from your Gmail inbox">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-colors ${
                profile?.gmailConnected ? 'bg-emerald-50 border border-emerald-100' : 'bg-gray-50 border border-gray-100'
              }`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="4" width="20" height="16" rx="2" stroke={profile?.gmailConnected ? '#059669' : '#9ca3af'} strokeWidth="1.75"/>
                  <path d="M2 7l10 7 10-7" stroke={profile?.gmailConnected ? '#059669' : '#9ca3af'} strokeWidth="1.75" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                {profile?.gmailConnected ? (
                  <>
                    <div className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      Connected
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{profile.gmailEmail}</div>
                  </>
                ) : (
                  <>
                    <div className="text-sm font-semibold text-gray-700">Not connected</div>
                    <div className="text-xs text-gray-400 mt-0.5">Link Gmail to send from your own inbox</div>
                  </>
                )}
              </div>
            </div>

            {profile?.gmailConnected ? (
              <button
                type="button"
                onClick={handleGmailDisconnect}
                disabled={gmailLoading}
                className="px-3 py-2 text-xs border border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-500 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                Disconnect
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGmailConnect}
                disabled={gmailLoading}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border border-indigo-200 text-indigo-600 hover:bg-indigo-50 active:bg-indigo-100 transition-colors disabled:opacity-50 shadow-sm"
              >
                {gmailLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                    className="w-3.5 h-3.5 border-2 border-indigo-200 border-t-indigo-500 rounded-full"
                  />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/>
                  </svg>
                )}
                Connect Gmail
              </button>
            )}
          </div>

          {!profile?.gmailConnected && (
            <p className="mt-3 text-[11px] text-gray-400 leading-relaxed bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">
              Clicking "Connect Gmail" will open Google's permission screen. BLKLIST only requests permission to <strong>send emails</strong> on your behalf — your inbox is never read.
            </p>
          )}
        </Card>

        {/* Save */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => router.push('/leads')}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Back to Leads
          </button>
          <motion.button
            type="submit"
            disabled={saving}
            whileTap={{ scale: 0.97 }}
            className={`px-6 py-2.5 text-sm font-semibold rounded-xl transition-all duration-150 shadow-sm ${
              saved
                ? 'bg-emerald-600 text-white shadow-emerald-200'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 disabled:opacity-50'
            }`}
          >
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save changes'}
          </motion.button>
        </div>
      </form>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense>
      <ProfilePageInner />
    </Suspense>
  )
}

// ── Small components ──────────────────────────────────────────────────────────

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm"
    >
      <div className="mb-5">
        <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </motion.div>
  )
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className="text-xs text-gray-400 font-medium block mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 transition-colors"
      />
    </div>
  )
}
