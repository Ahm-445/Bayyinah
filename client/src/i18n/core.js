import { createContext, useContext } from 'react'
import en from './en.js'

function lookup(dict, key) {
  return key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), dict)
}

function interpolate(text, params) {
  return text.replace(/\{(\w+)\}/g, (match, name) => (params?.[name] ?? match).toString())
}

/**
 * Builds { lang, locale, t } for a dictionary.
 * t('a.b', { name }) → string with {name} replaced.
 * A key whose value is an object of plural forms (zero/one/two/few/many/other)
 * picks the form for params.count with Intl.PluralRules (Arabic has all six).
 * Missing keys fall back to English, then to params.defaultValue, then the key.
 */
export function makeTranslator(lang, dict, fallback = en) {
  const plural = new Intl.PluralRules(lang)
  // Western digits in both languages, matching verse references like 51:56.
  const locale = lang === 'ar' ? 'ar-u-nu-latn' : 'en'

  function t(key, params) {
    let value = lookup(dict, key) ?? lookup(fallback, key)
    if (value && typeof value === 'object' && params?.count != null) {
      value = value[plural.select(params.count)] ?? value.other
    }
    if (typeof value !== 'string') {
      if (import.meta.env.DEV && params?.defaultValue === undefined) console.warn(`[i18n] missing key: ${key}`)
      return params?.defaultValue ?? key
    }
    return interpolate(value, params)
  }

  return { lang, locale, t }
}

// English by default, so components rendered outside the provider (e.g. the
// root error page) still get text.
export const I18nContext = createContext({ ...makeTranslator('en', en), dir: 'ltr', setLang: () => {} })

/** { t, lang, locale, dir, setLang } */
export function useI18n() {
  return useContext(I18nContext)
}
