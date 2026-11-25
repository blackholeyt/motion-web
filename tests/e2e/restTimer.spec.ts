import { expect, test, type Page } from '@playwright/test'
import { showFullView } from './helpers'

test.use({ locale: 'en-US' })

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    const key = 'motion.onboarding.v1.motion-local'
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ status: 'skipped', profileStepDone: true }))
    if (!localStorage.getItem('motion.consent.v1')) localStorage.setItem('motion.consent.v1', JSON.stringify({ version: 1, accepted_at: new Date().toISOString(), cloud_accepted_at: null }))
  })
})

async function secondsShown(page: Page) {
  const text = (await page.getByTestId('restCountdown').textContent()) ?? ''
  const match = /Rest (\d+):(\d{2})/.exec(text)
  if (!match) throw new Error(`No countdown in "${text}"`)
  return Number(match[1]) * 60 + Number(match[2])
}

test('the rest timer follows the clock across reloads and time spent in the background', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-03T10:00:00Z') })
  await page.goto('./')
  await expect(page.getByTestId('opening')).toBeHidden({ timeout: 5_000 })
  const hint = page.getByTestId('install-hint')
  if (await hint.isVisible()) await hint.getByRole('button', { name: 'Not now' }).first().click()

  await page.getByRole('link', { name: 'Blueprints' }).click()
  await page.getByRole('button', { name: 'Browse Starter Plans' }).click()
  await page.getByTestId('plan-push').click()
  await page.getByTestId('usePlan-push').click()
  await page.getByTestId('startWorkout').click()
  await showFullView(page)

  const row = page.getByTestId('set-Bench Press-1')
  await row.getByTestId('setLoad-1').fill('60')
  await row.getByTestId('setReps-1').fill('8')
  await row.getByTestId('complete-1').click()
  await expect(page.getByTestId('restCountdown')).toHaveText(/Rest \d+:\d{2}/)
  const duration = await secondsShown(page)
  expect(duration).toBeGreaterThan(30)

  // Reload 20 seconds in: the count continues from the stored deadline.
  await page.clock.fastForward(20_000)
  await page.reload()
  await showFullView(page)
  await expect(page.getByTestId('restCountdown')).toHaveText(/Rest \d+:\d{2}/)
  expect(Math.abs((await secondsShown(page)) - (duration - 20))).toBeLessThanOrEqual(3)

  // A frozen page runs no timers; coming back must still show the real time left.
  const frozenAt = (await page.evaluate(() => Date.now())) + 500
  await page.clock.pauseAt(frozenAt)
  const beforeFreeze = await secondsShown(page)
  await page.clock.setSystemTime(frozenAt + 10_000)
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })))
  await expect.poll(() => secondsShown(page)).toBeLessThanOrEqual(beforeFreeze - 9)
  await page.clock.resume()

  // The deadline passes while the app is closed: it reads as complete, then the bar goes idle.
  await page.clock.fastForward(duration * 1000)
  await page.reload()
  await showFullView(page)
  await expect(page.getByTestId('restCompleteNotice')).toHaveText('Rest complete')
  await page.clock.fastForward(5_000)
  // Without a running rest the bar is hidden.
  await expect(page.getByTestId('restBar')).toHaveCount(0)
  await expect(page.getByTestId('completedSetCount')).toHaveText('1 / 9')

  // The next completed set starts a fresh rest from the current time.
  const second = page.getByTestId('set-Bench Press-2')
  await second.getByTestId('setLoad-2').fill('60')
  await second.getByTestId('setReps-2').fill('8')
  await second.getByTestId('complete-2').click()
  await expect(page.getByTestId('restCountdown')).toHaveText(/Rest \d+:\d{2}/)
  expect(await secondsShown(page)).toBeGreaterThanOrEqual(duration - 1)
})
