import { expect, test } from '@playwright/test'

test.use({ locale: 'en-US' })

test('opens with the opening animation, then shows the dashboard', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByTestId('opening')).toBeVisible()
  await expect(page.getByTestId('opening')).toBeHidden({ timeout: 5_000 })
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your training')
})

test('navigates between the four tabs', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByTestId('opening')).toBeHidden({ timeout: 5_000 })
  await page.getByRole('link', { name: 'Blueprints' }).click()
  await expect(page.getByRole('heading', { name: 'Blueprints' })).toBeVisible()
  await page.getByRole('link', { name: 'History' }).click()
  await expect(page.getByRole('heading', { name: 'The work you put in.' })).toBeVisible()
  await page.getByRole('link', { name: 'Settings' }).click()
  await page.getByRole('combobox').selectOption('de')
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
