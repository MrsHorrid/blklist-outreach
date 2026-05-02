'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Galaxy } from '@/components/onboarding/Galaxy'

const ROLES = [
  { value: 'agency',     label: 'Agency owner',  desc: 'I run a creative or marketing agency' },
  { value: 'freelance',  label: 'Freelancer',    desc: 'I work independently with clients' },
  { value: 'in-house',   label: 'In-house team', desc: 'I work for a brand directly' },
  { value: 'founder',    label: 'Founder',       desc: 'I run a startup or small business' },
  { value: 'other',      label: 'Something else',desc: '' },
]

const SIZES = [
  { value: 'Just me',         label: 'Just me' },
  { value: '2-5 people',      label: '2–5 people' },
  { value: '6-20 people',     label: '6–20 people' },
  { value: '21-50 people',    label: '21–50 people' },
  { value: '50+ people',      label: '50+ people' },
]

const USE_CASES = [
  { value: 'cold-outreach',  label: 'Cold outreach',          desc: 'Find new prospects and send first emails' },
  { value: 'warm-followup',  label: 'Warm follow-ups',        desc: 'Manage existing pipeline and replies' },
  { value: 'research',       label: 'Lead research',          desc: 'Discover & enrich companies for sales team' },
  { value: 'all',            label: 'End-to-end CRM',         desc: 'Discovery, outreach, and pipeline management' },
]

type Step = 0 | 1 | 2 | 3 | 4 | 5

export default function OnboardingPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [step, setStep] = useState<Step>(0)
  const [submitting, setSubmitting] = useState(false)

  const [answers, setAnswers] = useState({
    name: session?.user?.name || '',
    primaryUseCase: '',
    businessName: '',
    businessSize: '',
    businessDescription: '',
    pitchAngle: '',
    targetAudience: '',
  })

  const totalSteps = 5
  const progress = ((step) / totalSteps) * 100

  const next = () => setStep((s) => Math.min(s + 1, totalSteps) as Step)
  const back = () => setStep((s) => Math.max(s - 1, 0) as Step)

  const submit = async () => {
    setSubmitting(true)
    try {
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answers),
      })
      router.push('/')
      router.refresh()
    } catch {
      setSubmitting(false)
    }
  }

  const skip = async () => {
    await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skipped: true }),
    })
    router.push('/')
    router.refresh()
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Galaxy />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10 sm:py-6">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-black text-[11px] font-bold tracking-tight">
            BL
          </div>
          <div className="text-white text-[13px] font-semibold tracking-tight">BLKLIST</div>
        </div>
        {step > 0 && step < totalSteps && (
          <button onClick={skip} className="text-white/40 hover:text-white/80 text-[12.5px] font-medium">
            Skip for now
          </button>
        )}
      </div>

      {/* Progress bar */}
      {step > 0 && (
        <div className="relative z-10 max-w-[480px] mx-auto px-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/45 text-[11px] font-medium tracking-wide uppercase">
              Step {step} of {totalSteps - 1}
            </span>
            <span className="text-white/45 text-[11px] tabular-nums">{Math.round(progress)}%</span>
          </div>
          <div className="h-[3px] w-full bg-white/[0.06] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-violet-400 to-indigo-400 rounded-full"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-200px)] px-6">
        <div className="w-full max-w-[480px]">
          <AnimatePresence mode="wait">
            {/* Step 0 — Welcome */}
            {step === 0 && (
              <Step key="0">
                <motion.div
                  initial={{ scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, duration: 0.6 }}
                  className="text-center mb-10"
                >
                  <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 items-center justify-center text-white text-xl font-bold mb-6 shadow-2xl shadow-violet-500/30">
                    BL
                  </div>
                  <h1 className="text-white text-[36px] font-semibold tracking-tighter leading-[1.05]">
                    Welcome to BLKLIST
                  </h1>
                  <p className="text-white/55 text-[15px] mt-4 leading-relaxed">
                    Let&apos;s spend 60 seconds setting up your workspace<br />
                    so we can find your best-fit leads.
                  </p>
                </motion.div>
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="flex justify-center"
                >
                  <button
                    onClick={next}
                    className="group h-12 px-7 bg-white text-black font-semibold rounded-xl text-[14px] hover:bg-white/95 inline-flex items-center gap-2 shadow-2xl shadow-white/10"
                  >
                    Let&apos;s go
                    <span className="transition-transform group-hover:translate-x-0.5">→</span>
                  </button>
                </motion.div>
              </Step>
            )}

            {/* Step 1 — Who are you */}
            {step === 1 && (
              <Step key="1">
                <Header eyebrow="About you" title="What's your name?" subtitle="So we can personalise your outreach signature." />
                <div className="space-y-3">
                  <FancyInput
                    placeholder="Alex Johnson"
                    value={answers.name}
                    onChange={v => setAnswers(a => ({ ...a, name: v }))}
                    autoFocus
                  />
                  <Nav onNext={next} onBack={back} disabledNext={!answers.name.trim()} />
                </div>
              </Step>
            )}

            {/* Step 2 — Role */}
            {step === 2 && (
              <Step key="2">
                <Header eyebrow="Role" title="Which best describes you?" subtitle="We'll tailor the AI to your context." />
                <div className="space-y-2">
                  {ROLES.map((r) => (
                    <CardChoice
                      key={r.value}
                      selected={answers.primaryUseCase === r.value}
                      onClick={() => setAnswers(a => ({ ...a, primaryUseCase: r.value }))}
                      title={r.label}
                      desc={r.desc}
                    />
                  ))}
                  <Nav onNext={next} onBack={back} disabledNext={!answers.primaryUseCase} />
                </div>
              </Step>
            )}

            {/* Step 3 — Business */}
            {step === 3 && (
              <Step key="3">
                <Header eyebrow="Your business" title="Tell us about your company" subtitle="What's it called and how big is the team?" />
                <div className="space-y-4">
                  <div>
                    <Label>Company name</Label>
                    <FancyInput
                      placeholder="BLKLIST Creative"
                      value={answers.businessName}
                      onChange={v => setAnswers(a => ({ ...a, businessName: v }))}
                      autoFocus
                    />
                  </div>
                  <div>
                    <Label>Team size</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {SIZES.map(s => (
                        <button
                          key={s.value}
                          onClick={() => setAnswers(a => ({ ...a, businessSize: s.value }))}
                          className={`h-11 px-3 rounded-lg border text-[13px] font-medium ${
                            answers.businessSize === s.value
                              ? 'bg-white text-black border-white'
                              : 'bg-white/[0.04] border-white/[0.08] text-white/70 hover:bg-white/[0.08] hover:text-white'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Nav onNext={next} onBack={back} disabledNext={!answers.businessName.trim() || !answers.businessSize} />
                </div>
              </Step>
            )}

            {/* Step 4 — What you do */}
            {step === 4 && (
              <Step key="4">
                <Header eyebrow="Your offering" title="What do you actually do?" subtitle="The more specific, the better the AI emails." />
                <div className="space-y-4">
                  <div>
                    <Label>One-sentence description</Label>
                    <FancyTextarea
                      placeholder="We're a performance creative agency producing high-converting social ads for DTC brands."
                      value={answers.businessDescription}
                      onChange={v => setAnswers(a => ({ ...a, businessDescription: v }))}
                      rows={3}
                      autoFocus
                    />
                  </div>
                  <div>
                    <Label>Your pitch angle (used in AI emails)</Label>
                    <FancyInput
                      placeholder="We help premium brands hit 30%+ CTR through high-converting creative"
                      value={answers.pitchAngle}
                      onChange={v => setAnswers(a => ({ ...a, pitchAngle: v }))}
                    />
                  </div>
                  <Nav onNext={next} onBack={back} disabledNext={!answers.businessDescription.trim()} />
                </div>
              </Step>
            )}

            {/* Step 5 — Use case + finish */}
            {step === 5 && (
              <Step key="5">
                <Header eyebrow="Almost done" title="What will you use BLKLIST for?" subtitle="We'll prioritise the right features for you." />
                <div className="space-y-2">
                  {USE_CASES.map(u => (
                    <CardChoice
                      key={u.value}
                      selected={answers.targetAudience === u.value}
                      onClick={() => setAnswers(a => ({ ...a, targetAudience: u.value }))}
                      title={u.label}
                      desc={u.desc}
                    />
                  ))}
                  <div className="flex gap-2 pt-2">
                    <button onClick={back} disabled={submitting} className="h-11 px-4 text-white/55 hover:text-white/85 text-[13px] font-medium">
                      ← Back
                    </button>
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={submit}
                      disabled={!answers.targetAudience || submitting}
                      className="flex-1 h-11 bg-white hover:bg-white/95 text-black font-semibold rounded-lg text-[13px] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 shadow-xl shadow-white/10"
                    >
                      {submitting ? (
                        <>
                          <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                            className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full" />
                          Setting up your workspace…
                        </>
                      ) : (
                        <>Finish setup ✨</>
                      )}
                    </motion.button>
                  </div>
                </div>
              </Step>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// ── Reusable bits ─────────────────────────────────────────────────────────────

function Step({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20, filter: 'blur(8px)' }}
      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, x: -20, filter: 'blur(8px)' }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

function Header({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-7 text-center">
      <div className="text-white/40 text-[11px] font-semibold uppercase tracking-[0.16em] mb-2.5">{eyebrow}</div>
      <h2 className="text-white text-[28px] font-semibold tracking-tighter leading-tight">{title}</h2>
      {subtitle && <p className="text-white/50 text-[13.5px] mt-2">{subtitle}</p>}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-white/55 text-[11.5px] font-medium mb-1.5 tracking-tight">{children}</div>
}

function FancyInput({ value, onChange, placeholder, autoFocus }: {
  value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean
}) {
  return (
    <input
      autoFocus={autoFocus}
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 h-12 text-white text-[14px] placeholder:text-white/25 focus:bg-white/[0.06] focus:border-white/25 focus:ring-4 focus:ring-white/5"
    />
  )
}

function FancyTextarea({ value, onChange, placeholder, rows = 3, autoFocus }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; autoFocus?: boolean
}) {
  return (
    <textarea
      autoFocus={autoFocus}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-[14px] placeholder:text-white/25 focus:bg-white/[0.06] focus:border-white/25 focus:ring-4 focus:ring-white/5 resize-none"
    />
  )
}

function CardChoice({ selected, onClick, title, desc }: {
  selected: boolean; onClick: () => void; title: string; desc?: string
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.99 }}
      className={`w-full text-left rounded-xl px-4 py-3.5 border ${
        selected
          ? 'bg-white text-black border-white shadow-xl shadow-white/10'
          : 'bg-white/[0.04] border-white/[0.08] text-white hover:bg-white/[0.08] hover:border-white/15'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="font-semibold text-[13.5px]">{title}</div>
        {selected && <span className="text-[14px]">✓</span>}
      </div>
      {desc && <div className={`text-[12px] mt-0.5 ${selected ? 'text-black/60' : 'text-white/50'}`}>{desc}</div>}
    </motion.button>
  )
}

function Nav({ onNext, onBack, disabledNext }: { onNext: () => void; onBack: () => void; disabledNext?: boolean }) {
  return (
    <div className="flex gap-2 pt-3">
      <button onClick={onBack} className="h-11 px-4 text-white/55 hover:text-white/85 text-[13px] font-medium">
        ← Back
      </button>
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onNext}
        disabled={disabledNext}
        className="flex-1 h-11 bg-white hover:bg-white/95 text-black font-semibold rounded-lg text-[13px] disabled:opacity-30 disabled:cursor-not-allowed shadow-xl shadow-white/10"
      >
        Continue →
      </motion.button>
    </div>
  )
}
