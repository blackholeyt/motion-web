import { expect, test } from '@playwright/test'

test.use({ locale: 'en-US' })

test('asks for consent first, exports CSV, and deleting the device data starts over', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByTestId('opening')).toBeHidden({ timeout: 5_000 })
  const hint = page.getByTestId('install-hint')
  if (await hint.isVisible()) await hint.getByRole('button', { name: 'Not now' }).first().click()

  await expect(page.getByTestId('consentTitle')).toBeVisible()
  await page.getByTestId('openPrivacyPolicy').click()
  await expect(page.getByTestId('legalDraft')).toBeVisible()
  await expect(page.getByText('1. Verantwortlicher')).toBeVisible()
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByTestId('acceptConsent')).toBeDisabled()
  await page.getByTestId('consentHealth').check()
  await page.getByTestId('consentAge').check()
  await page.getByTestId('acceptConsent').click()

  await page.getByTestId('onboardingProfileSkip').click()
  await page.getByTestId('onboardingExplore').click()
  await page.goto('./#/settings')

  const download = page.waitForEvent('download')
  await page.getByTestId('exportCSV').click()
  expect((await download).suggestedFilename()).toMatch(/^Motion-Export-\d{4}-\d{2}-\d{2}\.csv$/)

  await page.getByTestId('deleteDeviceData').click()
  await expect(page.getByTestId('confirmDelete')).toBeDisabled()
  await page.getByTestId('confirmDeletion').check()
  await page.getByTestId('confirmDelete').click()
  await expect(page.getByTestId('consentTitle')).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('motion.consent.v1'))).toBeNull()
})
