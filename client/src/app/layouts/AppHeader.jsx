import { Link } from 'react-router'
import { useI18n } from '../../i18n/core.js'
import { MOCK_STRINGS } from '../../i18n/mockStrings.js'
import { clearAuth } from '../../services/session.js'

async function resetMocks() {
  const { resetMockData } = await import('../../services/mocks/adapter.js')
  resetMockData()
  clearAuth() // the reset also removes registered accounts
  window.location.assign('/login')
}

/** The language switch: shows the other language's name, in that language. */
function LanguageToggle() {
  const { t, lang, setLang } = useI18n()
  const next = lang === 'ar' ? 'en' : 'ar'
  return (
    <button
      type="button"
      onClick={() => setLang(next)}
      lang={next}
      // The visible language name is the accessible name (WCAG label-in-name).
      title={t('lang.switchLabel')}
      className="btn btn-sm btn-ghost border-line"
    >
      {t('lang.switchTo')}
    </button>
  )
}

export default function AppHeader({ children }) {
  const { t, lang } = useI18n()
  return (
    <header className="relative z-20 bg-white shadow-nav md:sticky md:top-0">
      <a href="#main" className="skip-link">
        {t('common.skipToContent')}
      </a>
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2 md:min-h-[72px]">
        <Link to="/" className="flex items-baseline gap-2 font-semibold text-brand">
          <span lang="en" className="text-lg">
            Bayyinah
          </span>
          <span lang="ar" dir="rtl" className="font-quran text-xl leading-none">
            بيّنة
          </span>
        </Link>
        {/* Inline env check so real-API builds drop this and the mock import. */}
        {import.meta.env.VITE_USE_MOCKS === 'true' && (
          <button
            type="button"
            onClick={resetMocks}
            title={MOCK_STRINGS[lang].resetTitle}
            className="chip bg-amber-100 text-amber-800 hover:bg-amber-200"
          >
            {MOCK_STRINGS[lang].reset}
          </button>
        )}
        <div className="ms-auto flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          {children}
          <LanguageToggle />
        </div>
      </div>
    </header>
  )
}
