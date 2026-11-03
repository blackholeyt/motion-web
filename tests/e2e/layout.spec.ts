import { expect, test, type Locator, type Page } from '@playwright/test'

test.use({ locale: 'en-US' })

// Insets of an iPhone 15 installed as a PWA (status bar + Dynamic Island, home indicator).
// Playwright's WebKit reports env(safe-area-inset-*) as 0, so they are simulated.
const SAFE_TOP = 59
const SAFE_BOTTOM = 34
const shots = 'test-results/iphone-layout'

test.beforeEach(async ({ context }, testInfo) => {
  test.skip(testInfo.project.name !== 'iphone-webkit', 'iPhone layout only')
  await context.addInitScript(() => {
    const key = 'motion.onboarding.v1.motion-local'
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ status: 'skipped', profileStepDone: true }))
    if (!localStorage.getItem('motion.consent.v1')) localStorage.setItem('motion.consent.v1', JSON.stringify({ version: 1, accepted_at: new Date().toISOString(), cloud_accepted_at: null }))
  })
})

async function simulateInsets(page: Page) {
  await page.addStyleTag({
    content: `:root { --safe-top: ${SAFE_TOP}px !important; --safe-bottom: ${SAFE_BOTTOM}px !important;
      --safe-top-measured: ${SAFE_TOP}px !important; --safe-bottom-measured: ${SAFE_BOTTOM}px !important; }`,
  })
}

async function open(page: Page) {
  await page.goto('./')
  await expect(page.getByTestId('opening')).toBeHidden({ timeout: 5_000 })
  const hint = page.getByTestId('install-hint')
  if (await hint.isVisible()) await hint.getByRole('button', { name: 'Not now' }).first().click()
  await simulateInsets(page)
}

async function startPush(page: Page) {
  await open(page)
  await page.getByRole('link', { name: 'Blueprints' }).click()
  await page.getByRole('button', { name: 'Browse Starter Plans' }).click()
  await page.getByTestId('plan-push').click()
  await page.getByTestId('usePlan-push').click()
  await page.getByTestId('startWorkout').click()
  await expect(page.getByTestId('completedSetCount')).toHaveText('0 / 9')
}

async function box(locator: Locator) {
  const bounds = await locator.boundingBox()
  expect(bounds).not.toBeNull()
  return bounds!
}

test('sheet buttons start below the status bar', async ({ page }) => {
  await open(page)
  await page.getByRole('link', { name: 'Blueprints' }).click()
  await page.getByTestId('createBlueprint').click()
  const sheet = page.getByRole('dialog', { name: 'New Blueprint' })
  for (const name of ['Cancel', 'Save']) {
    const button = sheet.getByRole('button', { name, exact: true })
    await expect(button).toBeVisible()
    expect((await box(button)).y).toBeGreaterThanOrEqual(SAFE_TOP + 8)
  }
  await page.screenshot({ path: `${shots}/sheet-header.png` })
})
