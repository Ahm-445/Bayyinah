import { useI18n } from '../../i18n/core.js'

const DOT = {
  done: 'bg-emerald-500',
  warning: 'bg-amber-500',
  failed: 'bg-red-500',
  skipped: 'bg-stone-300',
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
    <ol className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-stone-600">
      {steps.map((step) => (
        <li key={step.stage} className="flex items-center gap-1.5">
          <span className={`size-2 rounded-full ${DOT[step.status] ?? DOT.done}`} aria-hidden />
          <span className="font-medium text-stone-800">
            {t(`pipeline.stages.${step.stage}`, { defaultValue: step.stage })}
          </span>
          {step.details?.length > 0 && <span>{step.details.map(text).join(' · ')}</span>}
          {step.ms != null && <span className="text-stone-400">{step.ms} ms</span>}
        </li>
      ))}
    </ol>
  )
}
