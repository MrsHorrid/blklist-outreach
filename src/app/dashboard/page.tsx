'use client'

import { useState, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

const INDUSTRIES = ['eCommerce', 'Fashion & Apparel', 'DTC Brands', 'SaaS', 'Gaming', 'Beauty & Skincare', 'Health & Wellness', 'Fintech', 'Travel', 'Media & Entertainment', 'Luxury', 'Sports & Fitness']
const GEOGRAPHIES = ['United States', 'United Kingdom', 'Europe', 'Global', 'APAC', 'North America', 'Middle East', 'Latin America']
const SIZES = ['Startup (1-50)', 'SMB (51-200)', 'Mid-market (201-1000)', 'Enterprise (1000+)']

interface UserProfile {
  id: string
  name: string | null
  email: string
  businessName: string | null
  businessDescription: string | null
  pitchAngle: string | null
  targetIndustries: string[]
  targetGeographies: string[]
  targetSizes: string[]
  gmailConnected: boolean
  gmailEmail: string | null
}

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    name: '',
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
    // Triggers Google OAuth flow scoped to Gmail
    window.location.href = '/api/auth/signin/google'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Profile</h1>
          <p className="text-gray-500 text-sm mt-1">
            Tell us about your business — AI uses this to find the most relevant leads.
          </p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors px-3 py-1.5 border border-gray-200 rounded-lg"
        >
          Sign out
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Identity */}
        <Card title="Identity" subtitle="Your account details">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Your name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1.5">Email</label>
              <input
                type="text"
                value={profile?.email || ''}
                disabled
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-400 cursor-not-allowed"
              />
            </div>
          </div>
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
            <label className="text-xs text-gray-500 font-medium block mb-1.5">What does your business do?</label>
            <textarea
              value={form.businessDescription}
              onChange={e => setForm(f => ({ ...f, businessDescription: e.target.value }))}
              rows={3}
              placeholder="We're a performance creative agency that produces social ads and video content for DTC brands. We specialise in high-conversion creative for paid social channels…"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
            />
          </div>
          <div className="mt-4">
            <label className="text-xs text-gray-500 font-medium block mb-1.5">Your pitch angle <span className="text-gray-400">(used in AI emails)</span></label>
            <input
              type="text"
              value={form.pitchAngle}
              onChange={e => setForm(f => ({ ...f, pitchAngle: e.target.value }))}
              placeholder="We help premium brands achieve 30%+ CTR through high-converting creative"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>
        </Card>

        {/* Target Criteria */}
        <Card title="Ideal Lead Criteria" subtitle="AI will prioritise these in discovery">
          <div className="space-y-5">
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-2">Target industries</label>
              <div className="flex flex-wrap gap-2">
                {INDUSTRIES.map(ind => (
                  <button
                    key={ind}
                    type="button"
                    onClick={() => toggleMulti('targetIndustries', ind)}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                      form.targetIndustries.includes(ind)
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
                    }`}
                  >
                    {ind}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-2">Target geographies</label>
              <div className="flex flex-wrap gap-2">
                {GEOGRAPHIES.map(geo => (
                  <button
                    key={geo}
                    type="button"
                    onClick={() => toggleMulti('targetGeographies', geo)}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                      form.targetGeographies.includes(geo)
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
                    }`}
                  >
                    {geo}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-2">Company sizes</label>
              <div className="flex flex-wrap gap-2">
                {SIZES.map(sz => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => toggleMulti('targetSizes', sz)}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                      form.targetSizes.includes(sz)
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Gmail */}
        <Card title="Gmail Integration" subtitle="Send outreach emails directly from your inbox">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${profile?.gmailConnected ? 'bg-green-50' : 'bg-gray-50'}`}>
                ✉
              </div>
              <div>
                {profile?.gmailConnected ? (
                  <>
                    <div className="text-sm font-medium text-gray-800">Connected</div>
                    <div className="text-xs text-gray-400">{profile.gmailEmail}</div>
                  </>
                ) : (
                  <>
                    <div className="text-sm font-medium text-gray-700">Not connected</div>
                    <div className="text-xs text-gray-400">Link your Gmail to send directly from BLKLIST</div>
                  </>
                )}
              </div>
            </div>
            {process.env.NEXT_PUBLIC_GOOGLE_ENABLED === 'true' ? (
              <button
                type="button"
                onClick={handleGmailConnect}
                className={`px-4 py-2 text-sm rounded-lg border font-medium transition-colors ${
                  profile?.gmailConnected
                    ? 'border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500'
                    : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                {profile?.gmailConnected ? 'Disconnect' : 'Connect Gmail'}
              </button>
            ) : (
              <div className="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 max-w-[200px] text-right leading-relaxed">
                Add <code className="font-mono text-gray-500">GOOGLE_CLIENT_ID</code> to .env.local to enable
              </div>
            )}
          </div>
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
          <button
            type="submit"
            disabled={saving}
            className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              saved
                ? 'bg-green-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50'
            }`}
          >
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="mb-5">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 font-medium block mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
      />
    </div>
  )
}
