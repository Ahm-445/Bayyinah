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
              className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                done
                  ? 'bg-emerald-600 text-white'
                  : active
                    ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-600 motion-safe:animate-pulse'
                    : 'bg-stone-200 text-stone-500'
              }`}
            >
              {done ? '✓' : index + 1}
            </span>
            <span className={active ? 'font-medium text-stone-900' : done ? 'text-stone-700' : 'text-stone-500'}>
              {t(`question.progress.${step.key}`)}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
