import { installHintKind } from './installState'

const iPhoneSafari = 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1'

describe('install hint', () => {
  it('explains Add to Home Screen in iPhone Safari', () => {
    expect(installHintKind({ userAgent: iPhoneSafari, maxTouchPoints: 5, standalone: false })).toBe('ios-safari')
  })
  it('stays hidden once installed', () => {
    expect(installHintKind({ userAgent: iPhoneSafari, maxTouchPoints: 5, standalone: true })).toBe('none')
  })
  it('points other iPhone browsers to Safari', () => {
    expect(installHintKind({ userAgent: iPhoneSafari.replace('Version/26.0', 'CriOS/140.0'), maxTouchPoints: 5, standalone: false })).toBe('ios-other-browser')
  })
  it('recognises iPadOS desktop user agents', () => {
    const iPad = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15'
    expect(installHintKind({ userAgent: iPad, maxTouchPoints: 5, standalone: false })).toBe('ios-safari')
    expect(installHintKind({ userAgent: iPad, maxTouchPoints: 0, standalone: false })).toBe('none')
  })
})
