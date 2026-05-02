'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ImageUploader } from '@/components/ui/ImageUploader'

interface Template {
  id?: string
  name: string
  headerImageUrl: string
  headerHtml: string
  accentColor: string
  fontFamily: string
  signatureName: string
  signatureTitle: string
  signatureCompany: string
  signatureImageUrl: string
  signaturePhone: string
  signatureWebsite: string
  signatureLinkedIn: string
  footerText: string
  footerImageUrl: string
}

const DEFAULT: Template = {
  name: 'Default',
  headerImageUrl: '',
  headerHtml: '',
  accentColor: '#5046E5',
  fontFamily: 'system',
  signatureName: '',
  signatureTitle: '',
  signatureCompany: '',
  signatureImageUrl: '',
  signaturePhone: '',
  signatureWebsite: '',
  signatureLinkedIn: '',
  footerText: '',
  footerImageUrl: '',
}

const SAMPLE_BODY = `Hey {{firstName}},

I saw {{company}} is doing some amazing work in {{industry}} — particularly around your recent campaigns.

We help brands like yours achieve 30%+ CTR through native in-feed placements on premium publishers. Would love to share a quick example of how this could work for {{company}}.

Open to a 15-min chat next week?`

export default function EmailTemplatePage() {
  const [template, setTemplate] = useState<Template>(DEFAULT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    fetch('/api/templates')
      .then(r => r.json())
      .then(({ template }) => {
        if (template) {
          setTemplate({
            ...DEFAULT,
            ...Object.fromEntries(Object.entries(template).map(([k, v]) => [k, v ?? ''])),
            accentColor: template.accentColor || '#5046E5',
            fontFamily: template.fontFamily || 'system',
          } as Template)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const set = <K extends keyof Template>(k: K, v: Template[K]) => setTemplate(t => ({ ...t, [k]: v }))

  const save = async () => {
    setSaving(true); setSaved(false); setSaveError('')
    try {
      const res = await fetch('/api/templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      })
      const data = await res.json()
      if (!res.ok) {
        setSaveError(data.error || 'Failed to save template')
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2200)
      }
    } catch {
      setSaveError('Network error — your images may be too large to send in one request')
    }
    setSaving(false)
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
    <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-10 lg:py-12">
      <div className="flex items-start justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tighter text-ink">Email template</h1>
          <p className="text-muted text-[13px] mt-1">
            Design how your outreach emails look. Used as the default for all sent messages.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveError && <span className="text-[12px] text-red-500">{saveError}</span>}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={save}
            disabled={saving}
            className={`h-10 px-5 text-[13px] font-semibold rounded-lg ${
              saved
                ? 'bg-emerald-600 text-white'
                : 'bg-ink text-white dark:text-black hover:opacity-90 disabled:opacity-50'
            }`}
          >
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save template'}
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,640px)] gap-6">
        {/* ── Editor ── */}
        <div className="space-y-4">
          {/* Brand */}
          <Card title="Brand" desc="Visual style of your emails">
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <Label>Accent color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={template.accentColor}
                    onChange={e => set('accentColor', e.target.value)}
                    className="w-10 h-10 rounded-lg border border-line cursor-pointer bg-surface"
                  />
                  <input
                    type="text"
                    value={template.accentColor}
                    onChange={e => set('accentColor', e.target.value)}
                    className="flex-1 text-[13px] border border-line rounded-lg px-3 h-10 bg-surface text-ink font-mono focus:border-accent focus:ring-2 focus:ring-accent/15"
                  />
                </div>
              </div>
              <div>
                <Label>Font</Label>
                <select
                  value={template.fontFamily}
                  onChange={e => set('fontFamily', e.target.value)}
                  className="w-full text-[13px] border border-line rounded-lg px-3 h-10 bg-surface text-ink focus:border-accent focus:ring-2 focus:ring-accent/15"
                >
                  <option value="system">System sans</option>
                  <option value="serif">Serif (Georgia)</option>
                  <option value="modern">Modern (Inter)</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Header */}
          <Card title="Header" desc="Optional branded banner at the top of every email">
            <ImageUploader
              value={template.headerImageUrl}
              onChange={v => set('headerImageUrl', v)}
              maxSizeMB={1.5}
              hint="Wide banner format works best — around 600×120px. PNG or JPG."
            />
          </Card>

          {/* Signature */}
          <Card title="Signature" desc="Appears at the bottom of every email">
            <div className="grid grid-cols-2 gap-3.5">
              <Field label="Name"    value={template.signatureName}    onChange={v => set('signatureName', v)}    placeholder="Alex Johnson" />
              <Field label="Title"   value={template.signatureTitle}   onChange={v => set('signatureTitle', v)}   placeholder="Head of Growth" />
              <Field label="Company" value={template.signatureCompany} onChange={v => set('signatureCompany', v)} placeholder="BLKLIST Creative" />
              <Field label="Phone"   value={template.signaturePhone}   onChange={v => set('signaturePhone', v)}   placeholder="+1 (555) 000-0000" />
              <Field label="Website"  value={template.signatureWebsite}  onChange={v => set('signatureWebsite', v)}  placeholder="https://blklist.com" />
              <Field label="LinkedIn" value={template.signatureLinkedIn} onChange={v => set('signatureLinkedIn', v)} placeholder="https://linkedin.com/in/alex" />
            </div>
            <div className="mt-4">
              <Label>Avatar / logo</Label>
              <ImageUploader
                value={template.signatureImageUrl}
                onChange={v => set('signatureImageUrl', v)}
                maxSizeMB={0.5}
                hint="Square format (e.g. 80×80px). Will appear circular next to your name."
              />
            </div>
          </Card>

          {/* Footer */}
          <Card title="Footer" desc="Banner image (or GIF) and disclaimer below the email">
            <Label>Footer image / GIF</Label>
            <ImageUploader
              value={template.footerImageUrl}
              onChange={v => set('footerImageUrl', v)}
              maxSizeMB={2.5}
              hint="Animated GIFs work too — keep under 2.5MB so the email isn't too heavy."
            />
            <div className="mt-4">
              <Label>Footer text</Label>
              <textarea
                value={template.footerText}
                onChange={e => set('footerText', e.target.value)}
                rows={2}
                placeholder='Sent with care. If this isn&apos;t relevant, just reply &quot;remove&quot;.'
                className="w-full text-[13px] border border-line rounded-lg px-3.5 py-2.5 bg-surface text-ink focus:border-accent focus:ring-2 focus:ring-accent/15 resize-none"
              />
            </div>
          </Card>
        </div>

        {/* ── Live preview ── */}
        <div className="lg:sticky lg:top-6 self-start">
          <div className="text-[11px] font-semibold text-faint uppercase tracking-[0.12em] mb-2.5">Preview</div>
          <div className="bg-zinc-100 dark:bg-zinc-900 rounded-2xl p-5 border border-line">
            <EmailPreview template={template} body={SAMPLE_BODY} />
          </div>
          <p className="text-[11px] text-faint mt-3 leading-relaxed">
            Tokens like <code className="text-muted bg-subtle px-1 py-0.5 rounded">{'{{firstName}}'}</code>, <code className="text-muted bg-subtle px-1 py-0.5 rounded">{'{{company}}'}</code> are auto-replaced when sending.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="bg-surface border border-line rounded-2xl p-6"
    >
      <div className="mb-4">
        <h2 className="text-[13px] font-semibold text-ink tracking-tight">{title}</h2>
        {desc && <p className="text-[12px] text-faint mt-0.5">{desc}</p>}
      </div>
      {children}
    </motion.section>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[11.5px] text-muted font-medium block mb-1.5 tracking-tight">{children}</label>
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <Label>{label}</Label>
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

// ── Email Preview ─────────────────────────────────────────────────────────────

function EmailPreview({ template, body }: { template: Template; body: string }) {
  const fontStack =
    template.fontFamily === 'serif' ? 'Georgia, serif' :
    template.fontFamily === 'modern' ? 'Inter, system-ui, sans-serif' :
    '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'

  const previewBody = body
    .replace(/\{\{firstName\}\}/g, 'Sarah')
    .replace(/\{\{company\}\}/g, 'Acme Co')
    .replace(/\{\{industry\}\}/g, 'eCommerce')

  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden text-zinc-900" style={{ fontFamily: fontStack }}>
      {/* Header image */}
      {template.headerImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={template.headerImageUrl} alt="" className="w-full h-auto block" style={{ maxHeight: 160, objectFit: 'cover' }} />
      )}

      {/* Subject (mock) */}
      <div className="px-10 pt-7 pb-3 border-b border-zinc-100">
        <div className="text-[10.5px] font-medium text-zinc-400 uppercase tracking-wide mb-1">Subject</div>
        <div className="text-[15px] font-semibold text-zinc-900">quick chat about Acme Co, Sarah?</div>
      </div>

      {/* Body */}
      <div className="px-10 pt-8 pb-6">
        <div className="text-[14.5px] leading-[1.65] text-zinc-800 whitespace-pre-line">
          {previewBody}
        </div>

        {/* Signature */}
        {(template.signatureName || template.signatureCompany) && (
          <div className="mt-8 pt-6 border-t border-zinc-100 flex items-start gap-4">
            {template.signatureImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={template.signatureImageUrl} alt="" className="w-[52px] h-[52px] rounded-full object-cover shrink-0" />
            )}
            <div className="text-[13px] leading-[1.55]">
              {template.signatureName && <div className="font-semibold text-zinc-900">{template.signatureName}</div>}
              {(template.signatureTitle || template.signatureCompany) && (
                <div className="text-zinc-500 mt-0.5">
                  {template.signatureTitle}
                  {template.signatureTitle && template.signatureCompany && <span> · </span>}
                  {template.signatureCompany}
                </div>
              )}
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[12px]" style={{ color: template.accentColor }}>
                {template.signaturePhone && <span className="text-zinc-500">{template.signaturePhone}</span>}
                {template.signatureWebsite && <a href={template.signatureWebsite} className="hover:underline">{template.signatureWebsite.replace(/^https?:\/\//, '')}</a>}
                {template.signatureLinkedIn && <a href={template.signatureLinkedIn} className="hover:underline">LinkedIn</a>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer image — has top spacing, then goes edge-to-edge */}
      {template.footerImageUrl && (
        <>
          <div className="h-6" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={template.footerImageUrl} alt="" className="w-full h-auto block" style={{ maxHeight: 200, objectFit: 'cover' }} />
        </>
      )}

      {/* Footer text */}
      {template.footerText && (
        <div className="px-10 py-5 bg-zinc-50 border-t border-zinc-100 text-[11px] text-zinc-400 leading-[1.55]">
          {template.footerText}
        </div>
      )}
    </div>
  )
}
