import { expect, test, type Page } from '@playwright/test'
import { appleSeconds, legacyBackup } from '../../src/test/legacyBackup'

test.use({ locale: 'en-US' })

// The smallest and largest supported phones, each with the insets of an installed PWA.
// Playwright's WebKit reports env(safe-area-inset-*) as 0, so they are simulated.
const phones = [
  { name: 'se', width: 375, height: 667, top: 20, bottom: 0 },
  { name: 'pro-max', width: 430, height: 932, top: 59, bottom: 34 },
]
const shots = 'test-results/finish-screens'

test.beforeEach(async ({ context, page }, testInfo) => {
  test.skip(testInfo.project.name !== 'iphone-webkit', 'iPhone layout only')
  await context.addInitScript(() => {
    const key = 'motion.onboarding.v1.motion-local'
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ status: 'skipped', profileStepDone: true, savedWorkoutTipDone: true }))
    if (!localStorage.getItem('motion.consent.v1')) localStorage.setItem('motion.consent.v1', JSON.stringify({ version: 1, accepted_at: new Date().toISOString(), cloud_accepted_at: null }))
  })
  // The settled state is what has to fit; the count-up only fills the same space.
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

async function open(page: Page) {
  await page.goto('./')
  await expect(page.getByTestId('opening')).toBeHidden({ timeout: 5_000 })
  const hint = page.getByTestId('install-hint')
  if (await hint.isVisible()) await hint.getByRole('button', { name: 'Not now' }).first().click()
}

async function usePhone(page: Page, phone: (typeof phones)[number]) {
  await page.setViewportSize({ width: phone.width, height: phone.height })
  await page.addStyleTag({
    content: `:root { --safe-top: ${phone.top}px !important; --safe-bottom: ${phone.bottom}px !important;
      --safe-top-measured: ${phone.top}px !important; --safe-bottom-measured: ${phone.bottom}px !important; }`,
  })
}

const guidance = { minimumReps: 6, maximumReps: 10, notes: '', progression: 'Build external load' }
const lifts = [
  { name: 'Bench Press', load: 70, goal: 100 },
  { name: 'Overhead Press', load: 40, goal: null },
  { name: 'Barbell Row', load: 60, goal: null },
  { name: 'Triceps Pushdown', load: 25, goal: null },
]
const uuid = (group: number, index: number) => `A0000000-0000-4000-8000-${String(group * 100 + index).padStart(12, '0')}`

/** Three comparable Push sessions in the past three weeks, all lifts PR-tracked. */
function pushHistory() {
  const day = 86_400_000
  const { profile, preferences } = legacyBackup()
  return {
    format: 'motion.full-backup',
    version: 1,
    exportedAt: appleSeconds(new Date().toISOString()),
    profile,
    preferences: { ...preferences, appearance: 'dark' },
    weights: [],
    weightRewards: [],
    workoutAwards: [],
    healthReceipts: [],
    library: lifts.map((lift, index) => ({
      id: uuid(1, index),
      name: lift.name,
      isPRTracked: true,
      ...(lift.goal ? { goalWeight: lift.goal } : {}),
    })),
    routines: [
      { id: uuid(2, 0), name: 'Push', exercises: lifts.map((_, index) => ({ exerciseID: uuid(1, index), sortOrder: index, targetSets: 2, warmUpSets: 0, guidance })) },
    ],
    workouts: [17, 10, 3].map((daysAgo, session) => ({
      id: uuid(3, session),
      date: appleSeconds(new Date(Date.now() - daysAgo * day).toISOString()),
      name: 'Push',
      isCompleted: true,
      earnedXP: 100,
      isFreestyle: false,
      isRetrospective: false,
      blueprintID: uuid(2, 0),
      exercises: lifts.map((lift, index) => ({
        id: uuid(4, session * 10 + index),
        exerciseID: uuid(1, index),
        identityReviewed: true,
        exerciseName: lift.name,
        isHistoryOnly: false,
        isRemoved: false,
        draftOrder: index,
        measurementType: 'Load & reps',
        guidance,
        sets: [1, 2].map((setIndex) => ({
          id: uuid(5, session * 100 + index * 10 + setIndex),
          setIndex,
          weight: lift.load + session * 2.5,
          reps: 8,
          isCompleted: true,
          isWarmUp: false,
          isSkipped: false,
          isRemoved: false,
        })),
      })),
    })),
  }
}

async function logSets(page: Page, loads: Record<string, string>, sets = [1, 2, 3]) {
  for (const [exercise, load] of Object.entries(loads)) {
    for (const index of sets) {
      const row = page.getByTestId(`set-${exercise}-${index}`)
      await row.getByTestId(`setLoad-${index}`).fill(load)
      await row.getByTestId(`setReps-${index}`).fill('8')
      await row.getByTestId(`complete-${index}`).click()
      await expect(row.getByTestId(`complete-${index}`)).toHaveAttribute('aria-pressed', 'true')
      // A new best shows an inline notice that shifts the rows below it.
      const notice = page.getByRole('button', { name: 'Dismiss personal record acknowledgment' })
      if (await notice.isVisible()) await notice.click()
    }
  }
  await page.getByTestId('finishWorkout').click()
  const partial = page.getByRole('button', { name: 'Save completed sets' })
  await expect(partial.or(page.getByTestId('celebration'))).toBeVisible()
  if (await partial.isVisible()) await partial.click()
  await expect(page.getByTestId('celebration')).toBeVisible()
}

/** Nothing scrolls, nothing is clipped, nothing leaves the screen or reaches into the safe areas. */
async function expectFits(page: Page, phone: (typeof phones)[number]) {
  const layout = await page.getByTestId('celebration').evaluate((root, insets) => {
    const body = root.querySelector<HTMLElement>('[data-testid="finishScreen"]')!
    const frame = body.getBoundingClientRect()
    const visible = (element: Element) => {
      const rect = element.getBoundingClientRect()
      return rect.width > 1 && rect.height > 1 && getComputedStyle(element).visibility !== 'hidden'
    }
    const describe = (element: Element) => element.outerHTML.slice(0, 90)
    return {
      root: { scroll: root.scrollHeight, client: root.clientHeight },
      body: { scroll: body.scrollHeight, client: body.clientHeight },
      page: { scroll: document.documentElement.scrollHeight, client: window.innerHeight },
      clipped: [...body.querySelectorAll('*')].filter(visible).filter((element) => {
        const rect = element.getBoundingClientRect()
        return rect.top < frame.top - 0.5 || rect.bottom > frame.bottom + 0.5 || rect.left < frame.left - 0.5 || rect.right > frame.right + 0.5
      }).map(describe),
      unsafe: [...root.querySelectorAll('button, h1, dl, ul, [role="img"], [role="progressbar"]')].filter(visible).filter((element) => {
        const rect = element.getBoundingClientRect()
        return rect.top < insets.top || rect.bottom > window.innerHeight - insets.bottom || rect.left < 0 || rect.right > window.innerWidth
      }).map((element) => {
        // Geometry in the message, so a failure says where the element ended up.
        const rect = element.getBoundingClientRect()
        const frame = root.getBoundingClientRect()
        const r = (value: number) => Math.round(value)
        return `${describe(element)} @ ${insets.name}: element ${r(rect.left)},${r(rect.top)}–${r(rect.right)},${r(rect.bottom)}; screen ${r(frame.left)},${r(frame.top)}–${r(frame.right)},${r(frame.bottom)}; window ${window.innerWidth}×${window.innerHeight}; DEBUG padTop=${getComputedStyle(root).paddingTop} finishTop=${getComputedStyle(root).getPropertyValue('--finish-top')} safeTop=${getComputedStyle(root).getPropertyValue('--safe-top')} measured=${getComputedStyle(root).getPropertyValue('--safe-top-measured')} banner=${getComputedStyle(root).getPropertyValue('--banner-height')} scrollY=${window.scrollY} rootScroll=${root.scrollTop} vv=${window.visualViewport?.offsetTop},${window.visualViewport?.pageTop},${window.visualViewport?.height},${window.visualViewport?.scale} topScroll=${(root.firstElementChild as HTMLElement).getBoundingClientRect().top}`
      }),
    }
  }, phone)
  expect(layout.root.scroll).toBeLessThanOrEqual(layout.root.client)
  expect(layout.body.scroll).toBeLessThanOrEqual(layout.body.client)
  expect(layout.page.scroll).toBeLessThanOrEqual(layout.page.client)
  expect(layout.clipped).toEqual([])
  expect(layout.unsafe).toEqual([])
}

async function walkScreens(page: Page, phone: (typeof phones)[number], prefix: string, expected: string[]) {
  const seen: string[] = []
  for (;;) {
    const screen = (await page.getByTestId('celebration').getAttribute('data-screen'))!
    seen.push(screen)
    await expect(page.getByTestId('finishStep')).toHaveText(`Screen ${seen.length} of ${expected.length}`)
    await expectFits(page, phone)
    await page.screenshot({ path: `${shots}/${prefix}-${phone.name}-${seen.length}-${screen}.png` })
    if (await page.getByTestId('celebrationContinue').isVisible()) break
    await page.getByTestId('celebrationNext').click()
  }
  expect(seen).toEqual(expected)
}

test('a first session shows its key figures and XP', async ({ page }) => {
  await open(page)
  await page.getByRole('link', { name: 'Blueprints' }).click()
  await page.getByRole('button', { name: 'Browse Starter Plans' }).click()
  await page.getByTestId('plan-push').click()
  await page.getByTestId('usePlan-push').click()
  await page.getByTestId('startWorkout').click()
  await logSets(page, { 'Bench Press': '60' })
  await usePhone(page, phones[0]!)
  await expect(page.getByTestId('finishStats')).toContainText('1,440 kg')
  await expect(page.getByTestId('celebration')).toContainText('a baseline')
  await walkScreens(page, phones[0]!, 'first', ['summary', 'xp'])
  await page.getByTestId('celebrationContinue').click()
  await expect(page.getByTestId('celebration')).toBeHidden()
})

test('records and weeks fit every phone without scrolling', async ({ page }) => {
  await open(page)
  await page.getByRole('link', { name: 'Settings' }).click()
  await page.getByTestId('importBackup').click()
  await page.getByTestId('importFile').setInputFiles({ name: 'Motion-Backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(pushHistory())) })
  await page.getByTestId('confirmImport').click()
  await expect(page.getByTestId('importReport')).toContainText('Import finished')
  await page.getByTestId('importDone').click()
  await page.getByRole('link', { name: 'Blueprints' }).click()
  await page.getByRole('button', { name: /^Push/ }).click()
  await page.getByTestId('startWorkout').click()
  await logSets(page, Object.fromEntries(lifts.map((lift) => [lift.name, String(lift.load + 10)])), [1, 2])
  for (const phone of phones) {
    await usePhone(page, phone)
    await walkScreens(page, phone, 'records', ['summary', 'xp', 'highlights', 'week'])
    if (phone !== phones.at(-1)) for (let step = 0; step < 3; step++) await page.keyboard.press('ArrowLeft')
  }
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByTestId('highlight')).toHaveCount(3)
  await expect(page.getByTestId('highlight').first()).toContainText('Load record')
  await expect(page.getByTestId('highlight').filter({ hasText: 'Bench Press' }).getByRole('progressbar')).toBeVisible()
  await expect(page.getByTestId('highlightsNote')).toContainText('+1 more · Compared 4 exercises')

  // Swiping back and forth, then skipping ends the flow from any screen.
  await page.mouse.move(300, 450)
  await page.mouse.down()
  await page.mouse.move(120, 460, { steps: 5 })
  await page.mouse.up()
  await expect(page.getByTestId('celebration')).toHaveAttribute('data-screen', 'week')
  await page.mouse.move(100, 450)
  await page.mouse.down()
  await page.mouse.move(320, 455, { steps: 5 })
  await page.mouse.up()
  await expect(page.getByTestId('celebration')).toHaveAttribute('data-screen', 'highlights')
  await page.getByTestId('celebrationSkip').click()
  await expect(page.getByTestId('celebration')).toBeHidden()
})

test('cardio finish screens leave out strength content and fit', async ({ page }) => {
  await open(page)
  for (const minutes of ['30', '25']) {
    await page.goto('./#/cardio?activity=Running')
    await page.getByRole('textbox', { name: 'Time · minutes' }).fill(minutes)
    await page.getByRole('textbox', { name: 'Distance · km' }).fill('5')
    await page.getByTestId('finishCardio').click()
    await expect(page.getByTestId('celebration')).toBeVisible()
    if (minutes === '30') await page.getByTestId('celebrationSkip').click()
  }
  for (const phone of phones) {
    await usePhone(page, phone)
    await walkScreens(page, phone, 'cardio', ['summary', 'xp', 'week'])
    if (phone !== phones.at(-1)) for (let step = 0; step < 2; step++) await page.keyboard.press('ArrowLeft')
  }
  await expect(page.getByTestId('celebration')).not.toContainText('Working sets')
  await page.getByTestId('celebrationContinue').click()
  await expect(page.getByTestId('celebration')).toBeHidden()
})
