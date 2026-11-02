import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { updateSettings } from '../settings/deviceSettings'

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({ needRefresh: [false, () => {}], offlineReady: [false, () => {}], updateServiceWorker: async () => {} }),
}))

describe('app shell', () => {
  beforeEach(() => updateSettings({ openingAnimation: false, language: 'en', appearance: 'dark' }))

  it('shows the four tabs and switches between them', async () => {
    const { App } = await import('./App')
    render(<App />)
    expect(screen.getByText('Your training, in perspective.', { normalizer: (s) => s.replace(/\s+/g, ' ') })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'History' }))
    expect(screen.getByRole('heading', { name: 'The work you put in.' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Settings' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Light' }))
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
