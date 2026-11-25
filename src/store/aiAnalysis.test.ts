import { GUIDE_URL, aiPrompt, aiTargets, periodStart } from './aiAnalysis'

describe('AI analysis', () => {
  it('counts the period back in whole weeks from today, or not at all', () => {
    const now = new Date(2026, 10, 25, 15, 30)
    expect(periodStart(4, now)).toEqual(new Date(2026, 9, 28))
    expect(periodStart(52, now)).toEqual(new Date(2025, 10, 26))
    expect(periodStart(null, now)).toBeNull()
  })

  it('points to the guide, names the file and asks for RIR first', () => {
    const german = aiPrompt(12, 'de', 'Motion-KI-Export-2026-11-25.csv')
    expect(german).toContain(GUIDE_URL)
    expect(german).toContain('den letzten 12 Wochen')
    expect(german).toContain('Motion-KI-Export-2026-11-25.csv')
    expect(german).toMatch(/Mit wie viel RIR/)
    expect(aiPrompt(null, 'en', 'x.csv')).toContain('my whole history')
  })

  it('offers ChatGPT, Claude and Perplexity', () => {
    expect(aiTargets.map((target) => target.label)).toEqual(['ChatGPT', 'Claude', 'Perplexity'])
  })
})
