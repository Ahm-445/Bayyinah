import { useI18n } from '../../i18n/core.js'

const TONE = {
  A: 'bg-sky-100 text-sky-800',
  B: 'bg-indigo-100 text-indigo-800',
  C: 'bg-amber-100 text-amber-800',
  D: 'bg-red-100 text-red-800',
}

export default function LevelChip({ level, showLabel = false }) {
  const { t } = useI18n()
  if (!level) return null
  const label = t(`level.${level}`, { defaultValue: '' })
  return (
    <span
      title={label}
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold ${TONE[level] ?? 'bg-stone-100 text-stone-700'}`}
    >
      <span className="whitespace-nowrap">{t('level.chip', { level })}</span>
      {showLabel && label && <span className="font-normal">· {label}</span>}
    </span>
  )
}
