const STATUS_STYLES: Record<string, string> = {
  DISCOVERED: 'bg-gray-100 text-gray-600',
  CONTACTED:  'bg-blue-50 text-blue-600',
  OPENED:     'bg-amber-50 text-amber-600',
  REPLIED:    'bg-violet-50 text-violet-600',
  MEETING:    'bg-green-50 text-green-700',
  CLOSED:     'bg-emerald-50 text-emerald-700',
  DISQUALIFIED: 'bg-red-50 text-red-500',
  DRAFT:      'bg-gray-100 text-gray-500',
  SENT:       'bg-blue-50 text-blue-600',
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
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}
