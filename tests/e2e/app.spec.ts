import { openSettings } from './helpers'
import { expect, test } from '@playwright/test'

test.use({ locale: 'en-US' })

// These tests start after the introduction; tests/e2e/introduction.spec.ts covers it.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    const key = 'motion.onboarding.v1.motion-local'
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ status: 'skipped', profileStepDone: true }))
    if (!localStorage.getItem('motion.consent.v1')) localStorage.setItem('motion.consent.v1', JSON.stringify({ version: 1, accepted_at: new Date().toISOString(), cloud_accepted_at: null }))
  })
})

test('opens with the opening animation, then shows the dashboard', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByTestId('opening')).toBeVisible()
  await expect(page.getByTestId('opening')).toBeHidden({ timeout: 5_000 })
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your training')
})

test('navigates between the tabs', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByTestId('opening')).toBeHidden({ timeout: 5_000 })
  await page.getByRole('link', { name: 'Blueprints' }).click()
  await expect(page.getByRole('heading', { name: 'Blueprints' })).toBeVisible()
  await page.getByRole('link', { name: 'History' }).click()
  await expect(page.getByRole('heading', { name: 'The work you put in.' })).toBeVisible()
  await openSettings(page)
  await page.getByRole('combobox', { name: 'Language' }).selectOption('de')
  await expect(page.getByRole('link', { name: 'Verlauf' })).toBeVisible()
})

test('is installable and starts offline after the first visit', async ({ page, context }) => {
  await page.goto('./')
  const manifest = await page.request.get('./manifest.webmanifest')
  expect(manifest.ok()).toBe(true)
  expect((await manifest.json()).display).toBe('standalone')
  // Wait until the service worker controls the page and has precached the app.
  await page.waitForFunction(async () => (await navigator.serviceWorker.ready).active?.state === 'activated')
  await page.reload()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your training', { timeout: 10_000 })
  await page.getByRole('link', { name: 'History' }).click()
  await expect(page.getByRole('heading', { name: 'The work you put in.' })).toBeVisible()
  await context.setOffline(false)
})
