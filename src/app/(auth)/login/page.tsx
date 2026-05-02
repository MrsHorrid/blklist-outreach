'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await signIn('credentials', { email: form.email, password: form.password, redirect: false })
    setLoading(false)
    if (res?.error) setError('Invalid email or password.')
    else { router.push('/leads'); router.refresh() }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    await signIn('google', { callbackUrl: '/leads' })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[380px]"
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-12 justify-center">
        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#08090b] text-[11px] font-bold tracking-tight">
          BL
        </div>
        <div className="text-white text-[15px] font-semibold tracking-tight">BLKLIST</div>
      </div>

      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl p-7 shadow-[0_1px_0_rgba(255,255,255,0.05)_inset]">
        <h1 className="text-white text-[22px] font-semibold tracking-tight mb-1.5">Welcome back</h1>
        <p className="text-white/40 text-[13px] mb-6">Sign in to continue to your workspace</p>

        {/* Google */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-white/95 active:bg-white/90 text-[#0a0a0c] font-medium h-10 rounded-lg text-[13px] disabled:opacity-60 mb-5"
        >
          {googleLoading ? <DotSpinner color="#0a0a0c" /> : <GoogleLogo />}
          Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="text-white/30 text-[11px] tracking-wide uppercase">or</span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="Email" type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="you@company.com" required />
          <Input label="Password" type="password" value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} placeholder="••••••••" required />

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/20 text-red-300 text-[12.5px] rounded-lg px-3.5 py-2.5"
            >
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white hover:bg-white/95 active:bg-white/90 text-[#08090b] font-semibold h-10 rounded-lg text-[13px] disabled:opacity-50 mt-4 inline-flex items-center justify-center"
          >
            {loading ? <DotSpinner color="#0a0a0c" /> : 'Sign in'}
          </button>
        </form>
      </div>

      <p className="text-center text-white/40 text-[13px] mt-7">
        No account?{' '}
        <Link href="/signup" className="text-white hover:text-white/85 font-medium transition-colors">
          Create one
        </Link>
      </p>
    </motion.div>
  )
}

// ── Reusable bits ──────────────────────────────────────────────────────────────

function Input({ label, type, value, onChange, placeholder, required }: {
  label: string; type: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean
}) {
  return (
    <div>
      <label className="text-white/55 text-[11.5px] font-medium block mb-1.5 tracking-tight">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3.5 h-10 text-white text-[13px] placeholder:text-white/20 focus:border-white/25 focus:bg-white/[0.06] focus:ring-2 focus:ring-white/[0.04]"
      />
    </div>
  )
}

function DotSpinner({ color = 'currentColor' }: { color?: string }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      className="w-3.5 h-3.5 border-2 rounded-full"
      style={{ borderColor: `${color}25`, borderTopColor: color }}
    />
  )
}

function GoogleLogo() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
