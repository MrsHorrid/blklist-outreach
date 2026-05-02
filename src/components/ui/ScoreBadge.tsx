export function ScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 80 ? 'text-emerald-700 bg-emerald-50 border-emerald-200/60' :
    score >= 60 ? 'text-sky-700 bg-sky-50 border-sky-200/60' :
    score >= 40 ? 'text-amber-700 bg-amber-50 border-amber-200/60' :
                  'text-red-600 bg-red-50 border-red-200/60'

  return (
    <span className={`inline-flex items-center justify-center min-w-[26px] h-[22px] px-1.5 rounded-md text-[11px] font-semibold border tabular-nums ${tone}`}>
      {score}
    </span>
  )
}
