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
    // A first launch asks for consent; continuing needs both confirmations.
    expect(await screen.findByTestId('acceptConsent')).toBeDisabled()
    await userEvent.click(screen.getByTestId('consentHealth'))
    expect(screen.getByTestId('acceptConsent')).toBeDisabled()
    await userEvent.click(screen.getByTestId('consentAge'))
    await userEvent.click(screen.getByTestId('acceptConsent'))
    // Then the introduction; it can be skipped entirely.
    await userEvent.click(await screen.findByTestId('onboardingProfileSkip'))
    await userEvent.click(await screen.findByTestId('onboardingExplore'))
    expect(await screen.findByText('Your training, in perspective.', { normalizer: (s) => s.replace(/\s+/g, ' ') })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'History' }))
    expect(screen.getByRole('heading', { name: 'The work you put in.' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Settings' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Light' }))
    expect(document.documentElement.dataset.theme).toBe('light')
  }, 15_000)

  it('creates the profile and a routine from a template in the introduction', async () => {
    localStorage.clear()
    const { freshDatabase } = await import('../test/db')
    await freshDatabase()
    const { App } = await import('./App')
    render(<App />)
    await userEvent.type(await screen.findByTestId('onboardingName'), 'Alex')
    await userEvent.click(screen.getByTestId('onboardingProfileContinue'))
    await userEvent.click(screen.getByTestId('onboardingProfileContinue'))
    await userEvent.type(screen.getByTestId('onboardingCurrentWeight'), '67,5')
    await userEvent.click(screen.getByTestId('onboardingProfileContinue'))
    await userEvent.click(screen.getByTestId('onboardingProfileContinue'))
    await userEvent.click(await screen.findByTestId('onboardingWelcomeContinue'))
    await userEvent.click(screen.getByTestId('onboardingTemplate'))
    for (let page = 0; page < 8; page++) {
      const next = screen.queryByTestId('onboardingPlanContinue')
      if (!next) break
      await userEvent.click(next)
    }
    await userEvent.click(screen.getByTestId('usePlan-full-quick'))
    expect(await screen.findByDisplayValue('Full Body · Start Simple')).toBeInTheDocument()
    const { db } = await import('../data/db')
    expect((await db.profiles.toArray())[0]!.name).toBe('Alex')
    expect(await db.body_weights.count()).toBe(1)
  })
})
