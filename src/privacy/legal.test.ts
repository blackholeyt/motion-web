import { imprint, legalDraft, placeholders, privacyPolicy } from './legal'

describe('legal texts', () => {
  it('stay marked as drafts while placeholders are left', () => {
    const left = [...placeholders(privacyPolicy), ...placeholders(imprint)]
    if (!legalDraft) expect(left).toEqual([])
    else expect(left.length).toBeGreaterThan(0)
  })
})
