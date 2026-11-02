import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'

// jsdom lacks matchMedia; components only need a stable "no match" answer.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}
