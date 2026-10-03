import { useI18n } from '../../../i18n/core.js'
import LevelChip from '../../../shared/components/LevelChip.jsx'
import PipelineTimeline from '../../../shared/components/PipelineTimeline.jsx'
import { pipelineSteps } from '../lib/pipelineSteps.js'

export default function QuestionPanel({ draft }) {
  const { t } = useI18n()
  const { question, safety } = draft
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600">
        <LevelChip level={question.level} showLabel />
        {question.category && (
          <span className="rounded bg-stone-100 px-2 py-0.5">
            {t(`categories.${question.category}`, { defaultValue: question.category })}
          </span>
        )}
        {question.risk && (
          <span className="rounded bg-stone-100 px-2 py-0.5">
            {t('risk.label', { risk: t(`risk.${question.risk}`, { defaultValue: question.risk }) })}
          </span>
        )}
      </div>
      {/* Question text keeps its own language and direction. */}
      <h1 dir="auto" lang={question.language} className="mt-3 text-xl font-semibold text-stone-900">
        {question.text}
      </h1>
      {safety?.reason && (
        <p className="mt-2 text-sm text-stone-600">
          <span className="font-medium">
            {t('safety.label', { decision: t(`safety.${safety.decision}`, { defaultValue: safety.decision ?? '' }) })}
          </span>{' '}
          {/* The reason is backend/AI content, not UI text. */}
          <span dir="auto">{safety.reason}</span>
        </p>
      )}
      <div className="mt-4 border-t border-stone-100 pt-3">
        <PipelineTimeline steps={pipelineSteps(draft)} />
      </div>
    </section>
  )
}
