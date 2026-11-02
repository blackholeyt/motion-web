import { useSettings, type LanguageChoice } from '../settings/deviceSettings'
import { de } from './de'

export type Language = 'en' | 'de'

const dictionaries: Record<Language, Record<string, string>> = { en: {}, de }

export function resolveLanguage(choice: LanguageChoice, preferred: readonly string[] = navigator.languages ?? []): Language {
  if (choice !== 'device') return choice
  return preferred.some((tag) => tag.toLowerCase().startsWith('de')) ? 'de' : 'en'
}

/** English source text is the key, as in the iOS string catalog. */
export function translate(language: Language, text: string, values: Record<string, string | number> = {}): string {
  const template = dictionaries[language][text] ?? text
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match))
}

export function useT() {
  const language = resolveLanguage(useSettings().language)
  const t = (text: string, values?: Record<string, string | number>) => translate(language, text, values)
  return { t, language, locale: language === 'de' ? 'de-DE' : 'en-US' }
}
