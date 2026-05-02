const STATUS_STYLES: Record<string, { dot: string; bg: string; text: string }> = {
  DISCOVERED:   { dot: 'bg-zinc-400',     bg: 'bg-zinc-100',    text: 'text-zinc-600' },
  CONTACTED:    { dot: 'bg-sky-500',      bg: 'bg-sky-50',      text: 'text-sky-700' },
  OPENED:       { dot: 'bg-amber-500',    bg: 'bg-amber-50',    text: 'text-amber-700' },
  REPLIED:      { dot: 'bg-violet-500',   bg: 'bg-violet-50',   text: 'text-violet-700' },
  MEETING:      { dot: 'bg-emerald-500',  bg: 'bg-emerald-50',  text: 'text-emerald-700' },
  CLOSED:       { dot: 'bg-emerald-600',  bg: 'bg-emerald-50',  text: 'text-emerald-700' },
  DISQUALIFIED: { dot: 'bg-red-400',      bg: 'bg-red-50',      text: 'text-red-600' },
  DRAFT:        { dot: 'bg-zinc-400',     bg: 'bg-zinc-100',    text: 'text-zinc-600' },
  SENT:         { dot: 'bg-sky-500',      bg: 'bg-sky-50',      text: 'text-sky-700' },
}

const STATUS_LABELS: Record<string, string> = {
  DISCOVERED:   'Discovered',
  CONTACTED:    'Contacted',
  OPENED:       'Opened',
  REPLIED:      'Replied',
  MEETING:      'Meeting',
  CLOSED:       'Closed',
  DISQUALIFIED: 'Disqualified',
  DRAFT:        'Draft',
  SENT:         'Sent',
}

export function Badge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { dot: 'bg-zinc-400', bg: 'bg-zinc-100', text: 'text-zinc-600' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 h-[22px] rounded-md text-[11px] font-medium ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}
