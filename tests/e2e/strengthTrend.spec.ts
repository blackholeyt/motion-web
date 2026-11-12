import { expect, test } from '@playwright/test'

test.use({ locale: 'en-US' })

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    const key = 'motion.onboarding.v1.motion-local'
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ status: 'skipped', profileStepDone: true }))
    if (!localStorage.getItem('motion.consent.v1')) localStorage.setItem('motion.consent.v1', JSON.stringify({ version: 1, accepted_at: new Date().toISOString(), cloud_accepted_at: null }))
  })
})

test('the strength trend starts with the biggest change and switches between muscles and exercises', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByTestId('opening')).toBeHidden({ timeout: 5_000 })
  // The iPhone profile shows the install hint over the lower part of the screen.
  const hint = page.getByTestId('install-hint')
  if (await hint.isVisible()) await hint.getByRole('button', { name: 'Not now' }).first().click()
  const card = page.getByTestId('strengthTrend')
  await expect(card).toContainText('No strength trend yet.')

  await page.getByRole('link', { name: 'Settings' }).click()
  await page.getByTestId('enterDemo').click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Demo Alex')

  // Muscles first: arms (triceps pushdown 20 → 32.5 kg) moved the most.
  const subject = page.getByTestId('trendSubject')
  const summary = page.getByTestId('trendSummary')
  await expect(page.getByTestId('trendMode-muscle')).toHaveAttribute('aria-pressed', 'true')
  await expect(subject).toHaveValue('Arms')
  await expect(summary).toContainText('+62.5 %')
  await expect(summary).toHaveAttribute('data-direction', 'gain')

  await subject.selectOption('Back')
  await expect(summary).toContainText('Average of 2 exercises')

  await page.getByTestId('trendMode-exercise').click()
  await expect(summary).toContainText('+25 kg')
  await subject.selectOption({ label: 'Bench Press · +8.3 %' })
  await expect(summary).toContainText('+5 kg')
  await expect(summary).toContainText('60 → 65 kg')
  await expect(card.getByRole('img')).toHaveAccessibleName('Strength trend of Bench Press in kg')

  // The choice per view survives switching back and forth.
  await page.getByTestId('trendMode-muscle').click()
  await expect(subject).toHaveValue('Back')

  if (process.env.TREND_SHOT) {
    await card.scrollIntoViewIfNeeded()
    await card.screenshot({ path: `${process.env.TREND_SHOT}-muscle.png` })
    await page.getByTestId('trendMode-exercise').click()
    await card.screenshot({ path: `${process.env.TREND_SHOT}-exercise.png` })
    await page.screenshot({ path: `${process.env.TREND_SHOT}-page.png`, fullPage: true })
  }
})
