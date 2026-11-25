import { expect, test, type Locator, type Page } from '@playwright/test'
import { showFullView, openSettings } from './helpers'

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
  await showFullView(page)
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

test('the finish dialog is never cut off, even with large text on a small phone', async ({ page }) => {
  await startPush(page)
  const set = page.getByTestId('set-Bench Press-1')
  await set.getByTestId('setLoad-1').fill('60')
  await set.getByTestId('setReps-1').fill('8')
  await set.getByTestId('complete-1').click()
  const check = async (name: string) => {
    await page.getByTestId('finishWorkout').click()
    const dialog = page.getByRole('alertdialog', { name: 'Finish this session?' })
    await expect(dialog).toBeVisible()
    const viewport = page.viewportSize()!
    const frame = await box(dialog)
    expect(frame.y).toBeGreaterThanOrEqual(SAFE_TOP)
    expect(frame.y + frame.height).toBeLessThanOrEqual(viewport.height - SAFE_BOTTOM)
    for (const label of ['Save completed sets', 'Keep training']) {
      const button = dialog.getByRole('button', { name: label })
      await expect(button).toBeInViewport({ ratio: 1 })
      const bounds = await box(button)
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(frame.y + frame.height)
    }
    await page.screenshot({ path: `${shots}/${name}.png` })
    await dialog.getByRole('button', { name: 'Keep training' }).click()
    await expect(dialog).toBeHidden()
  }
  await check('finish-dialog')

  // iPhone SE with the largest text size: the message scrolls, the buttons stay on screen.
  await page.setViewportSize({ width: 375, height: 667 })
  await page.addStyleTag({ content: 'html { font-size: 250% }' })
  await check('finish-dialog-se-large-text')
})

test('every set shows its kind as a badge', async ({ page }) => {
  await startPush(page)
  const bench = page.getByRole('region', { name: 'Bench Press' })
  const badge = (index: number) => bench.getByTestId(`set-Bench Press-${index}`).getByTestId(`setBadge-${index}`)
  await expect(badge(1)).toHaveText('1')
  await expect(badge(1)).toHaveAttribute('aria-label', 'Working set 1')

  await bench.getByTestId('set-Bench Press-1').getByRole('button', { name: 'Working set' }).click()
  await page.getByRole('menuitem', { name: 'Make warm-up' }).click()
  await expect(badge(1)).toHaveText('W')
  await expect(badge(1)).toHaveAttribute('aria-label', 'Warm-up set')
  await expect(badge(2)).toHaveText('1')
  await expect(badge(3)).toHaveText('2')

  for (const name of ['Bench Press', 'Overhead Press']) {
    const section = page.getByRole('region', { name })
    await section.getByRole('button', { name: 'Exercise options' }).click()
    await section.getByLabel('Superset').selectOption('A')
    await section.getByRole('button', { name: 'Exercise options' }).click()
  }
  await expect(badge(1)).toHaveText('W')
  await expect(badge(2)).toHaveText('A1')
  await expect(badge(2)).toHaveAttribute('aria-label', 'Superset A1, working set 1')
  await expect(bench.getByTestId('set-Bench Press-3')).toContainText('Working set 2')
  const press = page.getByRole('region', { name: 'Overhead Press' })
  await expect(press.getByTestId('setBadge-1')).toHaveText('A2')
  await bench.scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${shots}/set-badges.png` })
})

test('no screen scrolls sideways on a phone', async ({ page }) => {
  const fitsWidth = async (name: string) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, `${name} is wider than the screen`).toBeLessThanOrEqual(0)
  }
  await open(page)
  await fitsWidth('Dashboard')
  for (const tab of ['Progress', 'Blueprints', 'History']) {
    await page.getByRole('link', { name: tab }).click()
    await fitsWidth(tab)
  }
  await openSettings(page)
  await fitsWidth('Settings')
  await startPush(page)
  await fitsWidth('Workout')
})

test('the start card sits high on the dashboard, within reach of the thumb', async ({ page }) => {
  await open(page)
  const start = page.getByTestId('dashboardStartWorkout')
  await expect(start).toBeVisible()
  await expect(page.getByTestId('startCardLoading')).toHaveCount(0)
  const bounds = await box(start)
  // Before the compact phone header the card ended at about 393 px on an iPhone 15.
  expect(bounds.y + bounds.height).toBeLessThan(365)
  const viewport = page.viewportSize()!
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width)
  await page.screenshot({ path: `${shots}/dashboard.png` })
})
