import { useI18n } from '../../../i18n/core.js'
import { QUESTION_STATUS } from '../../../shared/lib/enums.js'

// One step per processing status, in order.
const STEPS = [
  { status: QUESTION_STATUS.SUBMITTED, key: 'received' },
  { status: QUESTION_STATUS.DRAFTING, key: 'preparing' },
  { status: QUESTION_STATUS.AWAITING_REVIEW, key: 'reviewing' },
]

export default function ProgressSteps({ status }) {
  const { t } = useI18n()
  const current = STEPS.findIndex((step) => step.status === status)

  return (
    <ol className="space-y-3" aria-label={t('question.progress.label')}>
      {STEPS.map((step, index) => {
        const done = index < current
        const active = index === current
        return (
          <li key={step.key} className="flex items-center gap-3" aria-current={active ? 'step' : undefined}>
            <span
              aria-hidden
              className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold ${
                done
                  ? 'bg-accent text-white'
                  : active
                    ? 'bg-mint text-brand ring-2 ring-accent motion-safe:animate-pulse'
                    : 'bg-black/10 text-ink-soft'
              }`}
            >
              {done ? '✓' : index + 1}
            </span>
            <span className={active ? 'font-semibold text-ink' : done ? 'text-ink-soft' : 'text-ink-soft'}>
              {t(`question.progress.${step.key}`)}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
