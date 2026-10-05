import { useCallback, useLayoutEffect, useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import ar from './ar.js'
import en from './en.js'
import { I18nContext, makeTranslator } from './core.js'

const STORAGE_KEY = 'bayyinah.lang'
const DICTIONARIES = { en, ar }

function readStored() {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'en' || value === 'ar' ? value : null
  } catch {
    return null
  }
}

/** Default when the user has not chosen: Arabic on dāʿī/admin pages, English elsewhere. */
function defaultFor(pathname) {
  return pathname.startsWith('/daee') || pathname.startsWith('/admin') ? 'ar' : 'en'
}

/**
 * Root route element: provides the UI language and mirrors it on <html>
 * (lang + dir). Only the interface is translated; question and answer
 * content keeps its own language (rendered with dir="auto").
 */
export default function I18nProvider() {
  const { pathname } = useLocation()
  const [chosen, setChosen] = useState(readStored)
  const lang = chosen ?? defaultFor(pathname)
  const dir = lang === 'ar' ? 'rtl' : 'ltr'

  // Layout effect: set direction before paint, so a page never flashes in the wrong direction.
  useLayoutEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = dir
  }, [lang, dir])

  const setLang = useCallback((next) => {
    setChosen(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore: the choice still applies for this page view
    }
  }, [])

  const value = useMemo(
    () => ({ ...makeTranslator(lang, DICTIONARIES[lang], en), dir, setLang }),
    [lang, dir, setLang],
  )

  return (
    <I18nContext.Provider value={value}>
      <Outlet />
    </I18nContext.Provider>
  )
}
