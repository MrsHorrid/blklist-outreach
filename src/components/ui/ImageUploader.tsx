'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  value: string                    // current URL or data URL
  onChange: (v: string) => void
  maxSizeMB?: number               // default 2
  accept?: string                  // default 'image/*'
  hint?: string                    // small help text under uploader
}

export function ImageUploader({ value, onChange, maxSizeMB = 2, accept = 'image/*', hint }: Props) {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const [showUrlMode, setShowUrlMode] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [meta, setMeta] = useState<{ sizeKB: number; type: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    setError('')

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (png, jpg, gif, webp, svg)')
      return
    }

    const maxBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxBytes) {
      setError(`Image is too large. Max ${maxSizeMB}MB.`)
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      onChange(result)
      setMeta({ sizeKB: Math.round(file.size / 1024), type: file.type.replace('image/', '').toUpperCase() })
    }
    reader.onerror = () => setError('Failed to read file')
    reader.readAsDataURL(file)
  }, [maxSizeMB, onChange])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const onPaste = (e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))
    if (item) {
      const f = item.getAsFile()
      if (f) handleFile(f)
    }
  }

  const remove = () => {
    onChange('')
    setMeta(null)
    setUrlInput('')
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const useUrl = () => {
    if (!urlInput.trim()) return
    if (!/^https?:\/\//i.test(urlInput)) {
      setError('URL must start with http:// or https://')
      return
    }
    onChange(urlInput.trim())
    setMeta(null)
    setShowUrlMode(false)
    setUrlInput('')
    setError('')
  }

  const hasImage = !!value
  const isDataUrl = value.startsWith('data:')

  return (
    <div className="space-y-2" onPaste={onPaste}>
      <AnimatePresence mode="wait">
        {hasImage ? (
          /* Preview state */
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="border border-line bg-subtle/40 rounded-xl p-3 flex items-center gap-3"
          >
            <div className="w-16 h-16 rounded-lg bg-surface border border-line flex items-center justify-center overflow-hidden shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value} alt="" className="w-full h-full object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-medium text-ink truncate">
                {isDataUrl ? `Uploaded ${meta?.type || 'image'}` : value.replace(/^https?:\/\//, '').slice(0, 40) + (value.length > 47 ? '…' : '')}
              </div>
              <div className="text-[11px] text-faint mt-0.5">
                {meta?.sizeKB ? `${meta.sizeKB} KB` : isDataUrl ? 'embedded' : 'external URL'}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-7 px-2.5 text-[11.5px] font-medium text-muted hover:text-ink border border-line rounded-md hover:bg-subtle"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={remove}
                aria-label="Remove image"
                className="h-7 w-7 inline-flex items-center justify-center text-faint hover:text-red-500 border border-line rounded-md hover:bg-subtle"
              >
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                  <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </motion.div>
        ) : showUrlMode ? (
          /* URL input state */
          <motion.div
            key="url"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            <div className="flex gap-2">
              <input
                autoFocus
                type="url"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); useUrl() } if (e.key === 'Escape') setShowUrlMode(false) }}
                placeholder="https://yourdomain.com/image.png"
                className="flex-1 text-[13px] border border-line rounded-lg px-3.5 h-10 bg-surface text-ink focus:border-accent focus:ring-2 focus:ring-accent/15"
              />
              <button
                type="button"
                onClick={useUrl}
                className="h-10 px-3 text-[12.5px] font-semibold text-white dark:text-black bg-ink rounded-lg hover:opacity-90"
              >
                Use
              </button>
              <button
                type="button"
                onClick={() => { setShowUrlMode(false); setUrlInput(''); setError('') }}
                className="h-10 px-2 text-[12.5px] font-medium text-muted hover:text-ink"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        ) : (
          /* Upload zone */
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`w-full rounded-xl border-2 border-dashed p-6 flex flex-col items-center justify-center text-center cursor-pointer ${
                dragOver
                  ? 'border-accent bg-accent/[0.04]'
                  : 'border-line bg-subtle/30 hover:bg-subtle/60 hover:border-zinc-300 dark:hover:border-zinc-600'
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2.5 ${dragOver ? 'bg-accent/10 text-accent' : 'bg-subtle border border-line text-faint'}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div className="text-[13px] font-medium text-ink">
                {dragOver ? 'Drop to upload' : 'Drop image or click to upload'}
              </div>
              <div className="text-[11.5px] text-faint mt-1">
                PNG, JPG, GIF, WebP &middot; up to {maxSizeMB}MB
              </div>
            </button>
            <div className="flex items-center justify-center mt-2">
              <button
                type="button"
                onClick={() => setShowUrlMode(true)}
                className="text-[11.5px] text-muted hover:text-ink font-medium"
              >
                Or paste an image URL
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
        }}
      />

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -2 }} animate={{ opacity: 1, y: 0 }}
          className="text-[11.5px] text-red-500"
        >
          {error}
        </motion.p>
      )}

      {hint && !hasImage && !showUrlMode && !error && (
        <p className="text-[11px] text-faint">{hint}</p>
      )}
    </div>
  )
}
