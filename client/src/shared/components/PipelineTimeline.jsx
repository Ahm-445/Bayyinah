import { useI18n } from '../../i18n/core.js'

const DOT = {
  done: 'bg-accent',
  warning: 'bg-amber-500',
  failed: 'bg-danger',
  skipped: 'bg-black/10',
}

/**
 * Pipeline stages in reading order. `steps`: [{ stage, status, ms?, details? }]
 * where `details` is a list of { key, params } (translated) or plain strings.
 * Timings are shown only when present (api.md does not provide them today).
 */
export default function PipelineTimeline({ steps }) {
  const { t } = useI18n()
  if (!steps?.length) return null
  const text = (d) => (typeof d === 'string' ? d : t(d.key, d.params))
  return (
    <ol className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-soft">
      {steps.map((step) => (
        <li key={step.stage} className="flex items-center gap-1.5">
          <span className={`size-2 rounded-full ${DOT[step.status] ?? DOT.done}`} aria-hidden />
          <span className="font-semibold text-ink">
            {t(`pipeline.stages.${step.stage}`, { defaultValue: step.stage })}
          </span>
          {step.details?.length > 0 && <span>{step.details.map(text).join(' · ')}</span>}
          {step.ms != null && <span className="text-black/40">{step.ms} ms</span>}
        </li>
      ))}
    </ol>
  )
}
