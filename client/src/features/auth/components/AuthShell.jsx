import { useI18n } from '../../../i18n/core.js'

const STEPS = ['one', 'two', 'three', 'four']

/**
 * Sign-in / register frame: a deep-green band that says what the platform
 * does, beside the form card. The band stacks above the form on narrow
 * screens, where the steps are left out to keep the form near the top.
 */
export default function AuthShell({ children }) {
  const { t } = useI18n()
  return (
    <div className="grid flex-1 lg:grid-cols-[2fr_3fr]">
      <section className="bg-house px-6 py-10 text-white lg:px-12 lg:py-20">
        <div className="mx-auto max-w-md">
          <p className="display text-3xl leading-tight font-semibold lg:text-[2.8rem]">{t('ask.title')}</p>
          <p className="mt-4 text-lg leading-relaxed text-white/70">{t('ask.subtitle')}</p>
          <div className="mt-10 hidden border-t border-white/20 pt-8 lg:block">
            <p className="eyebrow text-white/70">{t('ask.howItWorks')}</p>
            <ol className="mt-5 space-y-4">
              {STEPS.map((step, index) => (
                <li key={step} className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="flex size-7 shrink-0 items-center justify-center rounded-full border border-white/70 text-xs font-semibold tabular-nums"
                  >
                    {index + 1}
                  </span>
                  <span className="pt-0.5 text-white/90">{t(`ask.steps.${step}`)}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
      <div className="flex items-start justify-center px-4 py-10 lg:items-center">
        <section className="card w-full max-w-sm p-6 sm:p-8">{children}</section>
      </div>
    </div>
  )
}
