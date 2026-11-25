import { expect, test, type Page } from '@playwright/test'
import { showFullView } from './helpers'

test.use({ locale: 'en-US' })

// Insets of an iPhone 15 installed as a PWA. Playwright's WebKit reports env(safe-area-inset-*) as 0.
const SAFE_TOP = 59
const SAFE_BOTTOM = 34

test.beforeEach(async ({ context }, testInfo) => {
  test.skip(testInfo.project.name !== 'iphone-webkit', 'iPhone focus view only')
  await context.addInitScript(() => {
    const key = 'motion.onboarding.v1.motion-local'
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ status: 'skipped', profileStepDone: true }))
    if (!localStorage.getItem('motion.consent.v1')) localStorage.setItem('motion.consent.v1', JSON.stringify({ version: 1, accepted_at: new Date().toISOString(), cloud_accepted_at: null }))
  })
})

async function insets(page: Page, top: number, bottom: number) {
  await page.addStyleTag({ content: `:root { --safe-top: ${top}px !important; --safe-bottom: ${bottom}px !important; }` })
}

async function startPush(page: Page, safe = { top: SAFE_TOP, bottom: SAFE_BOTTOM }) {
  await page.goto('./')
  await expect(page.getByTestId('opening')).toBeHidden({ timeout: 5_000 })
  const hint = page.getByTestId('install-hint')
  if (await hint.isVisible()) await hint.getByRole('button', { name: 'Not now' }).first().click()
  await insets(page, safe.top, safe.bottom)
  await page.getByRole('link', { name: 'Blueprints' }).click()
  await page.getByRole('button', { name: 'Browse Starter Plans' }).click()
  await page.getByTestId('plan-push').click()
  await page.getByTestId('usePlan-push').click()
  await page.getByTestId('startWorkout').click()
  await expect(page.getByTestId('focusView')).toBeVisible()
}

const activeIndex = async (page: Page) => Number(await page.locator('[data-testid="focusSlide"][data-active="true"]').getAttribute('data-index'))

/** Waits until the card at `index` is the one on screen, dismissing a record notice that would hold the advance back. */
async function expectActive(page: Page, index: number) {
  const notice = page.getByRole('button', { name: 'Dismiss personal record acknowledgment' })
  await expect
    .poll(async () => {
      if (await notice.isVisible()) await notice.click()
      return activeIndex(page)
    })
    .toBe(index)
}

test('a workout opens in the focus view with the first set as one big card', async ({ page }) => {
  await startPush(page)
  await expect(page.getByTestId('viewToggle')).toHaveAttribute('data-view', 'focus')
  await expect(page.getByTestId('completedSetCount')).toHaveText('0 / 9')
  expect(await activeIndex(page)).toBe(0)
  const card = page.getByTestId('set-Bench Press-1')
  await expect(card).toBeInViewport({ ratio: 1 })
  await expect(card.getByRole('heading', { name: 'Bench Press' })).toBeVisible()
  await expect(card).toContainText('Set 1 of 9')
  await expect(card).toContainText('Next: Bench Press · set 2')
  await expect(card.getByTestId('setLoad-1')).toBeVisible()
  await expect(card.getByTestId('setReps-1')).toBeVisible()
  // The full list is not mounted at the same time.
  await expect(page.getByTestId('workoutNotes')).toHaveCount(0)
  // Inputs stay above 16px, or iOS would zoom into them.
  const size = await card.getByTestId('setLoad-1').evaluate((element) => parseFloat(getComputedStyle(element).fontSize))
  expect(size).toBeGreaterThanOrEqual(17)
})

test('ticking a set scrolls on to the next unfinished set', async ({ page }) => {
  await startPush(page)
  const first = page.getByTestId('set-Bench Press-1')
  await first.getByTestId('setLoad-1').fill('60')
  await first.getByTestId('setReps-1').fill('8')
  await first.getByTestId('complete-1').click()
  await expect(first.getByTestId('complete-1')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('completedSetCount')).toHaveText('1 / 9')
  await expectActive(page, 1)
  await expect(page.getByTestId('set-Bench Press-2')).toBeInViewport({ ratio: 1 })
  await expect(page.getByTestId('restCountdown')).toContainText('Rest')

  // The rest shows big on the card on screen, with −15 / +15.
  const before = await page.getByTestId('restPanel').getByTestId('restCountdown').textContent()
  await page.getByTestId('restPlus').click()
  await expect(page.getByTestId('restPanel').getByTestId('restCountdown')).not.toHaveText(before ?? '')

  // A set that cannot be completed (no reps) keeps the card and shows a short note instead of a dialog.
  const second = page.getByTestId('set-Bench Press-2')
  await second.getByTestId('setLoad-2').fill('60')
  await second.getByTestId('complete-2').click()
  await expect(page.getByTestId('toast')).toBeVisible()
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  expect(await activeIndex(page)).toBe(1)
  await expect(page.getByTestId('completedSetCount')).toHaveText('1 / 9')
})

test('the arrow buttons and scrolling change the card; cards snap vertically', async ({ page }) => {
  await startPush(page)
  await expect(page.getByTestId('focusPrevious')).toBeDisabled()
  await page.getByTestId('focusNext').click()
  await expect.poll(() => activeIndex(page)).toBe(1)
  await expect(page.getByTestId('set-Bench Press-2')).toBeInViewport({ ratio: 1 })
  await page.getByTestId('focusPrevious').click()
  await expect.poll(() => activeIndex(page)).toBe(0)

  const scroller = page.getByTestId('focusScroller')
  const style = await scroller.evaluate((element) => {
    const computed = getComputedStyle(element)
    return { snap: computed.scrollSnapType, overscroll: computed.overscrollBehaviorY }
  })
  expect(style.snap).toContain('y')
  expect(style.snap).toContain('mandatory')
  expect(style.overscroll).toBe('contain')

  await scroller.evaluate((element) => element.scrollTo({ top: element.clientHeight * 2 }))
  await expect.poll(() => activeIndex(page)).toBe(2)
  await expect(page.getByTestId('set-Bench Press-3')).toBeInViewport({ ratio: 1 })
})

test('switching to the full view and back keeps the data', async ({ page }) => {
  await startPush(page)
  const first = page.getByTestId('set-Bench Press-1')
  await first.getByTestId('setLoad-1').fill('70')
  await first.getByTestId('setReps-1').fill('5')
  await page.getByTestId('viewToggle').click()
  await expect(page.getByTestId('viewToggle')).toHaveAttribute('data-view', 'full')
  await expect(page.getByTestId('focusView')).toHaveCount(0)
  await expect(page.getByTestId('set-Bench Press-1').getByTestId('setLoad-1')).toHaveValue('70')
  await expect(page.getByTestId('set-Bench Press-1').getByTestId('setReps-1')).toHaveValue('5')

  // Complete it in the full list; the focus view then opens on the next set and shows the saved values.
  await page.getByTestId('set-Bench Press-1').getByTestId('complete-1').click()
  await expect(page.getByTestId('completedSetCount')).toHaveText('1 / 9')
  const notice = page.getByRole('button', { name: 'Dismiss personal record acknowledgment' })
  if (await notice.isVisible()) await notice.click()
  await page.getByTestId('set-Bench Press-2').getByTestId('setLoad-2').fill('72')
  await page.getByTestId('set-Bench Press-2').getByTestId('setLoad-2').blur()
  await page.getByTestId('viewToggle').click()
  await expect(page.getByTestId('focusView')).toBeVisible()
  await expect(page.getByTestId('completedSetCount')).toHaveText('1 / 9')
  await expect.poll(() => activeIndex(page)).toBe(1)
  await expect(page.getByTestId('set-Bench Press-2').getByTestId('setLoad-2')).toHaveValue('72')

  // Going back to the full list always works, and the full view is the same as before.
  await showFullView(page)
  await expect(page.getByTestId('set-Bench Press-1').getByTestId('complete-1')).toHaveAttribute('aria-pressed', 'true')
})

test('skipped sets are passed over and the set menu works on the card', async ({ page }) => {
  await startPush(page)
  await page.getByTestId('focusNext').click()
  await expect.poll(() => activeIndex(page)).toBe(1)
  await page.getByTestId('set-Bench Press-2').getByRole('button', { name: 'Working set' }).click()
  await page.getByRole('menuitem', { name: 'Skip set' }).click()
  await expect(page.getByTestId('set-Bench Press-2').getByTestId('complete-2')).toBeDisabled()
  await page.getByTestId('focusPrevious').click()
  await expect.poll(() => activeIndex(page)).toBe(0)

  const first = page.getByTestId('set-Bench Press-1')
  await first.getByTestId('setLoad-1').fill('60')
  await first.getByTestId('setReps-1').fill('8')
  await first.getByTestId('complete-1').click()
  // Set 2 is skipped, so the next card is set 3.
  await expectActive(page, 2)
})

for (const [name, viewport, safe] of [
  ['iPhone 15', { width: 393, height: 852 }, { top: SAFE_TOP, bottom: SAFE_BOTTOM }],
  ['iPhone SE', { width: 375, height: 667 }, { top: 20, bottom: 0 }],
] as const) {
  test(`the card fits ${name} without horizontal overflow`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await startPush(page, safe)
    const card = page.getByTestId('set-Bench Press-1')
    const check = card.getByTestId('complete-1')
    await expect(check).toBeInViewport({ ratio: 1 })

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    const scrollerOverflow = await page.getByTestId('focusScroller').evaluate((element) => element.scrollWidth - element.clientWidth)
    expect(scrollerOverflow).toBeLessThanOrEqual(0)

    const bounds = async (id: string | 'check') => {
      const box = await (id === 'check' ? check : page.getByTestId(id)).boundingBox()
      expect(box).not.toBeNull()
      return box!
    }
    const cardBox = (await card.boundingBox())!
    const checkBox = await bounds('check')
    const nav = await bounds('focusPrevious')
    expect(cardBox.x).toBeGreaterThanOrEqual(0)
    expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(viewport.width)
    expect(checkBox.height).toBeGreaterThanOrEqual(64)
    expect(checkBox.y + checkBox.height).toBeLessThanOrEqual(viewport.height - safe.bottom)
    expect(cardBox.y).toBeGreaterThanOrEqual(nav.y + nav.height - 1)
    expect(nav.height).toBeGreaterThanOrEqual(44)
    await page.screenshot({ path: `test-results/iphone-focus/${name.replace(' ', '-')}.png` })
  })
}
