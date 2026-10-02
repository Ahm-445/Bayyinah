const DOT = {
  done: 'bg-emerald-500',
  warning: 'bg-amber-500',
  failed: 'bg-red-500',
  skipped: 'bg-stone-300',
}

/**
 * Pipeline stages, left to right. `steps`: [{ stage, status, ms?, detail? }].
 * Timings are shown only when present (api.md does not provide them today).
 */
export default function PipelineTimeline({ steps }) {
  if (!steps?.length) return null
  return (
    <ol className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-stone-600">
      {steps.map((step) => (
        <li key={step.stage} className="flex items-center gap-1.5">
          <span className={`size-2 rounded-full ${DOT[step.status] ?? DOT.done}`} aria-hidden />
          <span className="font-medium text-stone-800">{step.stage}</span>
          {step.detail && <span>{step.detail}</span>}
          {step.ms != null && <span className="text-stone-400">{step.ms} ms</span>}
        </li>
      ))}
    </ol>
  )
}
