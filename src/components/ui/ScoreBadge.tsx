export function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? 'text-green-600 bg-green-50 ring-green-200' :
    score >= 60 ? 'text-blue-600 bg-blue-50 ring-blue-200' :
    score >= 40 ? 'text-amber-600 bg-amber-50 ring-amber-200' :
                  'text-red-500 bg-red-50 ring-red-200'

  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ring-1 ${color}`}>
      {score}
    </span>
  )
}
