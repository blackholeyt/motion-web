import { expect, test, type Page } from '@playwright/test'

test.use({ locale: 'en-US' })

async function dismissHint(page: Page) {
  const hint = page.getByTestId('install-hint')
  if (await hint.isVisible()) await hint.getByRole('button', { name: 'Not now' }).first().click()
}

test('the introduction leads to a first workout that earns XP', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByTestId('opening')).toBeHidden({ timeout: 5_000 })
  await dismissHint(page)
  await page.getByTestId('onboardingName').fill('Mathis')
  await page.getByTestId('onboardingProfileContinue').click()
  await page.getByTestId('onboardingProfileContinue').click()
  await page.getByTestId('onboardingProfileContinue').click()
  await page.getByTestId('onboardingProfileContinue').click()
  await page.getByTestId('onboardingWelcomeContinue').click()
  await page.getByTestId('onboardingTemplate').click()
  while (await page.getByTestId('onboardingPlanContinue').isVisible()) await page.getByTestId('onboardingPlanContinue').click()
  await page.getByTestId('usePlan-full-quick').click()
  await expect(page.getByRole('textbox', { name: 'Name' })).toHaveValue('Full Body · Start Simple')

  await page.getByTestId('startWorkout').click()
  await expect(page.getByTestId('firstSetTip')).toBeVisible()
  const row = page.getByTestId('set-Leg Press-1')
  await row.getByTestId('setLoad-1').fill('80')
  await row.getByTestId('setReps-1').fill('10')
  await row.getByTestId('complete-1').click()
  await expect(page.getByTestId('firstSetTip')).toBeHidden()
  await page.getByTestId('finishWorkout').click()
  await page.getByRole('button', { name: 'Save completed sets' }).click()
  // The first workout explains saving instead of the reward screen.
  await expect(page.getByTestId('workoutSaved')).toBeVisible()
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.getByRole('link', { name: 'Dashboard' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Mathis')
  await expect(page.getByTestId('progressCard')).toContainText('100 XP')
})

test('the demo runs on synthetic data and leaves personal data untouched', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByTestId('opening')).toBeHidden({ timeout: 5_000 })
  await dismissHint(page)
  await page.getByTestId('onboardingProfileSkip').click()
  await page.getByTestId('onboardingExplore').click()
  await page.getByRole('link', { name: 'Settings' }).click()
  await page.getByTestId('enterDemo').click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Demo Alex')
  await expect(page.getByTestId('record-Deadlift')).toContainText('115 kg')
  await page.getByTestId('exitDemo').click()
  await page.getByRole('link', { name: 'Dashboard' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your training')
  await expect(page.getByTestId('progressCard')).toContainText('0 XP')
})
