import { useSettings, type LanguageChoice } from '../settings/deviceSettings'
import { de } from './de'
import iosCatalog from './de-ios.json'
import englishPlurals from './en-ios-plurals.json'

export type Language = 'en' | 'de'
type Values = Record<string, string | number> | (string | number)[]

// Translations from the iOS string catalog first; web-specific texts override them.
const dictionaries: Record<Language, Record<string, string>> = {
  en: { ...(englishPlurals as Record<string, string>), 'Back (muscle)': 'Back', 'Core (muscle)': 'Core', 'Average of {0} exercises#one': 'From 1 exercise',
    '{0} sets#one': '{0} set', '{0} exercises#one': '{0} exercise', '{0} saved sessions#one': '{0} saved session',
    '{0} exercises · {1} working · {2} warm-up#one': '{0} exercise · {1} working · {2} warm-up',
    '{0} exercises · {1} sets#one': '{0} exercise · {1} sets',
    '{0} changes waiting#one': '{0} change waiting',
    '{0} new records#one': 'New record',
    '{0} workouts this week#one': '1 workout this week',
    'Compared {0} exercises with their most recent recorded session.#one': 'Compared 1 exercise with its most recent recorded session.',
    '{0} workouts from Apple Health or Strava are skipped. They stay in your file for the native app.#one':
      '1 workout from Apple Health or Strava is skipped. It stays in your file for the native app.',
    'Skipped: {0} workouts from Apple Health or Strava.#one': 'Skipped: 1 workout from Apple Health or Strava.',
    '{0} workouts in this period#one': '1 workout in this period',
    '{0} workouts#one': '{0} workout',
    '{0} sets are still open. Only completed sets are saved.#one': '1 set is still open. Only completed sets are saved.',
    'Offline · {0} changes waiting#one': 'Offline · {0} change waiting',
    '{0} changes are not backed up yet. If you sign out now, they stay on this device and upload the next time you sign in with this account.#one':
      '1 change is not backed up yet. If you sign out now, it stays on this device and uploads the next time you sign in with this account.',
  },
  de: { ...(iosCatalog as Record<string, string>), ...de },
}

export function resolveLanguage(choice: LanguageChoice, preferred: readonly string[] = navigator.languages ?? []): Language {
  if (choice !== 'device') return choice
  return preferred.some((tag) => tag.toLowerCase().startsWith('de')) ? 'de' : 'en'
}

/**
 * English source text is the key, as in the iOS string catalog.
 * Placeholders are {name} or positional {0}, {1} (converted from %@ / %lld).
 * A "<key>#one" entry is the singular form, used when the first value is 1.
 */
export function translate(language: Language, text: string, values: Values = {}): string {
  const lookup = values as Record<string, string | number>
  const first = Array.isArray(values) ? values[0] : undefined
  const dictionary = dictionaries[language]
  const template = (first === 1 || first === '1' ? dictionary[`${text}#one`] : undefined) ?? dictionary[text] ?? text
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in lookup ? String(lookup[name]) : match))
}

export function localeFor(language: Language) {
  return language === 'de' ? 'de-DE' : 'en-US'
}

export function useT() {
  const language = resolveLanguage(useSettings().language)
  const t = (text: string, values?: Values) => translate(language, text, values)
  return { t, language, locale: localeFor(language) }
}

export type Translate = (text: string, values?: Values) => string
