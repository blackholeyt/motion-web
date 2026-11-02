import { resolveLanguage, translate } from '.'

describe('i18n', () => {
  it('follows the device language unless chosen explicitly', () => {
    expect(resolveLanguage('device', ['de-DE', 'en'])).toBe('de')
    expect(resolveLanguage('device', ['fr-FR'])).toBe('en')
    expect(resolveLanguage('en', ['de-DE'])).toBe('en')
  })

  it('uses English text as key and fills placeholders', () => {
    expect(translate('en', '{count} saved sessions', { count: 3 })).toBe('3 saved sessions')
    expect(translate('de', '{count} saved sessions', { count: 3 })).toBe('3 gespeicherte Trainings')
    expect(translate('de', 'Blueprints')).toBe('Routinen')
  })
})
