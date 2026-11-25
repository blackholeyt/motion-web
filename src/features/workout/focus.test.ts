import { currentSetIndex, indexAtScroll, nextOpenIndex } from './focus'

const row = (is_completed: boolean, is_skipped = false) => ({ set: { is_completed, is_skipped } })

describe('focus view positions', () => {
  it('opens on the first set that is neither completed nor skipped', () => {
    expect(currentSetIndex([row(true), row(true), row(false), row(false)])).toBe(2)
    expect(currentSetIndex([row(true), row(false, true), row(false)])).toBe(2)
    expect(currentSetIndex([row(false), row(false)])).toBe(0)
  })

  it('shows the last set when everything is done, and the first card for an empty workout', () => {
    expect(currentSetIndex([row(true), row(true, false), row(false, true)])).toBe(2)
    expect(currentSetIndex([])).toBe(0)
  })

  it('advances to the next open set, skipping completed and skipped ones', () => {
    expect(nextOpenIndex([row(true), row(false), row(false)], 0)).toBe(1)
    expect(nextOpenIndex([row(true), row(true), row(false, true), row(false)], 1)).toBe(3)
  })

  it('wraps to an earlier open set when nothing is left below, and gives -1 when all is done', () => {
    expect(nextOpenIndex([row(false), row(true), row(true)], 2)).toBe(0)
    expect(nextOpenIndex([row(true), row(true), row(false, true)], 1)).toBe(-1)
  })

  it('maps a scroll position to a card and stays within bounds', () => {
    expect(indexAtScroll(0, 500, 3)).toBe(0)
    expect(indexAtScroll(260, 500, 3)).toBe(1)
    expect(indexAtScroll(5000, 500, 3)).toBe(2)
    expect(indexAtScroll(-20, 500, 3)).toBe(0)
    expect(indexAtScroll(100, 0, 3)).toBe(0)
  })
})
