import { about, legalDraft, placeholders, privacyPolicy } from './legal'

describe('legal texts', () => {
  it('stay marked as drafts while placeholders are left', () => {
    const left = [...placeholders(privacyPolicy), ...placeholders(about)]
    if (!legalDraft) expect(left).toEqual([])
    else expect(left.length).toBeGreaterThan(0)
  })

  it('publish no postal address for the private operation', () => {
    const text = JSON.stringify([privacyPolicy, about])
    expect(text).not.toMatch(/Anschrift|Straße|PLZ|§ 5 DDG/)
  })
})
