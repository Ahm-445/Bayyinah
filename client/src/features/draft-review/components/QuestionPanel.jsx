import { useI18n } from '../../../i18n/core.js'
import LevelChip from '../../../shared/components/LevelChip.jsx'
import PipelineTimeline from '../../../shared/components/PipelineTimeline.jsx'
import { pipelineSteps } from '../lib/pipelineSteps.js'

export default function QuestionPanel({ draft }) {
  const { t } = useI18n()
  const { question, safety } = draft
  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
        <LevelChip level={question.level} showLabel />
        {question.category && (
          <span className="chip bg-ceramic font-normal text-ink-soft">
            {t(`categories.${question.category}`, { defaultValue: question.category })}
          </span>
        )}
        {question.risk && (
          <span className="chip bg-ceramic font-normal text-ink-soft">
            {t('risk.label', { risk: t(`risk.${question.risk}`, { defaultValue: question.risk }) })}
          </span>
        )}
      </div>
      {/* Question text keeps its own language and direction. */}
      <h1 dir="auto" lang={question.language} className="mt-3 text-2xl leading-snug font-semibold text-brand">
        {question.text}
      </h1>
      {safety?.reason && (
        <p className="mt-2 text-sm text-ink-soft">
          <span className="font-medium">
            {t('safety.label', { decision: t(`safety.${safety.decision}`, { defaultValue: safety.decision ?? '' }) })}
          </span>{' '}
          {/* The reason is backend/AI content, not UI text. */}
          <span dir="auto">{safety.reason}</span>
        </p>
      )}
      <div className="mt-5 border-t border-black/10 pt-4">
        <PipelineTimeline steps={pipelineSteps(draft)} />
      </div>
    </section>
  )
}
