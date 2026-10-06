import { useI18n } from '../../i18n/core.js'

const TONE = {
  A: 'bg-mint text-brand',
  B: 'bg-ceramic text-ink',
  C: 'bg-amber-100 text-amber-800',
  D: 'bg-danger/10 text-danger',
}

export default function LevelChip({ level, showLabel = false }) {
  const { t } = useI18n()
  if (!level) return null
  const label = t(`level.${level}`, { defaultValue: '' })
  return (
    <span
      title={label}
      className={`chip ${TONE[level] ?? 'bg-ceramic text-ink-soft'}`}
    >
      <span className="whitespace-nowrap">{t('level.chip', { level })}</span>
      {showLabel && label && <span className="font-normal">· {label}</span>}
    </span>
  )
}
