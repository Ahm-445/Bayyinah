import { LEVEL_LABEL } from '../lib/enums.js'

const TONE = {
  A: 'bg-sky-100 text-sky-800',
  B: 'bg-indigo-100 text-indigo-800',
  C: 'bg-amber-100 text-amber-800',
  D: 'bg-red-100 text-red-800',
}

export default function LevelChip({ level, showLabel = false }) {
  if (!level) return null
  return (
    <span
      title={LEVEL_LABEL[level]}
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold ${TONE[level] ?? 'bg-stone-100 text-stone-700'}`}
    >
      Level {level}
      {showLabel && LEVEL_LABEL[level] && (
        <span className="font-normal">· {LEVEL_LABEL[level]}</span>
      )}
    </span>
  )
}
