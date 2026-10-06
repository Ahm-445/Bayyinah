import { Link, useLocation } from 'react-router'
import { useI18n } from '../../../i18n/core.js'
import { getAuth } from '../../../services/session.js'
import { ROLE } from '../../../shared/lib/enums.js'
import { homeFor } from '../../../shared/lib/roles.js'

const STEPS = ['one', 'two', 'three', 'four']
// Wide and tinted cells sit on the diagonal, so the grid reads as a composition, not four equal cards.
const FEATURES = [
  { key: 'sources', cell: 'bg-mint lg:col-span-2' },
  { key: 'human', cell: 'bg-white shadow-card' },
  { key: 'compare', cell: 'bg-white shadow-card' },
  { key: 'honest', cell: 'bg-mint lg:col-span-2' },
]

/** Public landing page at "/": what Bayyinah is, how it works, and where to start. */
export default function HomePage() {
  const { t } = useI18n()
  useLocation() // re-read the session after signing out on this same page
  const auth = getAuth()
  const user = auth?.token ? auth.user : null
  // Signed in: one action, back to their own dashboard. Signed out: register, or sign in.
  const primary = !user
    ? { to: '/register', label: t('home.start') }
    : { to: homeFor(user.role), label: user.role === ROLE.QUESTIONER ? t('nav.ask') : t('nav.queue') }

  return (
    <>
      <section className="bg-house text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-[3fr_2fr] lg:py-24">
          <div>
            <p className="eyebrow rise text-white/70">{t('home.eyebrow')}</p>
            <h1 className="display rise mt-4 text-4xl leading-[1.1] font-semibold lg:text-6xl" style={{ '--i': 1 }}>
              {t('home.title')}
            </h1>
            <p className="rise mt-5 max-w-[60ch] text-lg leading-relaxed text-white/70" style={{ '--i': 2 }}>
              {t('home.body')}
            </p>
            <div className="rise mt-8 flex flex-wrap gap-3" style={{ '--i': 3 }}>
              <Link to={primary.to} className="btn btn-lg bg-white text-accent hover:bg-mint">
                {primary.label}
              </Link>
              {!user && (
                <Link to="/login" className="btn btn-lg border-white text-white hover:bg-white/10">
                  {t('nav.signIn')}
                </Link>
              )}
            </div>
          </div>

          {/* A sample source, shown the way a reviewer sees evidence. Always Arabic, in the Qur'an font. */}
          <figure className="card rise p-6 text-ink sm:p-8" style={{ '--i': 4 }}>
            <figcaption className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-brand">{t('home.sampleRef')}</span>
              <span className="chip bg-mint text-brand">{t('home.sampleLabel')}</span>
            </figcaption>
            <p lang="ar" dir="rtl" className="font-quran mt-5 text-4xl leading-loose">
              قُلْ هُوَ ٱللَّهُ أَحَدٌ
            </p>
            <p className="mt-5 border-t border-black/10 pt-4 text-sm text-ink-soft">{t('home.sampleNote')}</p>
          </figure>
        </div>
      </section>

      {/* Steps as a ruled sequence: the numbers carry it, so no cards. */}
      <section aria-labelledby="home-how" className="mx-auto w-full max-w-6xl px-4 py-16 lg:py-24">
        <h2 id="home-how" className="display text-3xl font-semibold text-brand lg:text-4xl">
          {t('ask.howItWorks')}
        </h2>
        <ol className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step} className="border-t-2 border-brand pt-5">
              <span aria-hidden className="text-4xl font-semibold text-brand tabular-nums">
                {index + 1}
              </span>
              <p className="mt-3 leading-relaxed">{t(`ask.steps.${step}`)}</p>
            </li>
          ))}
        </ol>
        <p className="mt-10 max-w-[65ch] text-sm text-ink-soft">{t('ask.referralNote')}</p>
      </section>

      <section aria-labelledby="home-why" className="bg-ceramic">
        <div className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
          <h2 id="home-why" className="display text-3xl font-semibold text-brand lg:text-4xl">
            {t('home.whyTitle')}
          </h2>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {FEATURES.map(({ key, cell }) => (
              <article key={key} className={`rounded-card p-6 sm:p-8 ${cell}`}>
                <h3 className="text-xl font-semibold text-brand">{t(`home.features.${key}.title`)}</h3>
                <p className="mt-2 max-w-[55ch] leading-relaxed text-ink-soft">{t(`home.features.${key}.body`)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* The closing invitation is to register, so only signed-out visitors see it. */}
      {!user && (
        <section className="mx-auto w-full max-w-6xl px-4 pt-16 pb-20 lg:pt-24 lg:pb-28">
          <h2 className="display text-3xl font-semibold text-brand lg:text-4xl">{t('home.closingTitle')}</h2>
          <p className="mt-3 max-w-[55ch] text-lg text-ink-soft">{t('home.closingBody')}</p>
          <Link to="/register" className="btn btn-primary btn-lg mt-8">
            {t('home.start')}
          </Link>
        </section>
      )}
    </>
  )
}
