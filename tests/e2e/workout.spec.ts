import { expect, test, type Page } from '@playwright/test'

test.use({ locale: 'en-US' })

// These tests start after the introduction; tests/e2e/introduction.spec.ts covers it.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    const key = 'motion.onboarding.v1.motion-local'
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ status: 'skipped', profileStepDone: true }))
  })
})

async function openOffline(page: Page) {
  await page.goto('./')
  await page.waitForFunction(async () => (await navigator.serviceWorker.ready).active?.state === 'activated')
  await page.reload()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
  await page.context().setOffline(true)
  await page.reload()
  await expect(page.getByTestId('opening')).toBeHidden({ timeout: 5_000 })
  // iPhone Safari shows the install hint once; it can be dismissed.
  const hint = page.getByTestId('install-hint')
  if (await hint.isVisible()) await hint.getByRole('button', { name: 'Not now' }).first().click()
}

async function enterSet(page: Page, exercise: string, index: number, load: string, reps: string) {
  const row = page.getByTestId(`set-${exercise}-${index}`)
  await row.getByTestId(`setLoad-${index}`).fill(load)
  await row.getByTestId(`setReps-${index}`).fill(reps)
  await row.getByTestId(`complete-${index}`).click()
  await expect(row.getByTestId(`complete-${index}`)).toHaveAttribute('aria-pressed', 'true')
}

test('a complete workout works offline and survives a restart mid-session', async ({ page }) => {
  await openOffline(page)

  // Copy the "Push" starter template and start it, all without network.
  await page.getByRole('link', { name: 'Blueprints' }).click()
  await page.getByRole('button', { name: 'Browse Starter Plans' }).click()
  await page.getByTestId('plan-push').click()
  await page.getByTestId('usePlan-push').click()
  await expect(page.getByRole('textbox', { name: 'Name' })).toHaveValue('Push')
  await page.getByTestId('startWorkout').click()
  await expect(page.getByTestId('completedSetCount')).toHaveText('0 / 9')

  await enterSet(page, 'Bench Press', 1, '60', '8')
  await expect(page.getByTestId('restCountdown')).toContainText('Rest 1:')
  // Unfinished input of the next set is kept exactly as typed.
  await page.getByTestId('set-Bench Press-2').getByTestId('setLoad-2').fill('62,5')
  await page.getByTestId('set-Bench Press-2').getByTestId('setLoad-2').blur()
  await page.waitForTimeout(400)

  // Restart: close and reopen the page while still offline.
  const url = page.url()
  await page.close()
  const reopened = await page.context().newPage()
  await reopened.goto(url)
  await expect(reopened.getByTestId('completedSetCount')).toHaveText('1 / 9')
  await expect(reopened.getByTestId('set-Bench Press-1').getByTestId('setLoad-1')).toHaveValue('60')
  await expect(reopened.getByTestId('set-Bench Press-2').getByTestId('setLoad-2')).toHaveValue('62,5')
  await expect(reopened.getByTestId('restCountdown')).toContainText('Rest')

  await reopened.getByTestId('set-Bench Press-2').getByTestId('setReps-2').fill('6')
  await reopened.getByTestId('set-Bench Press-2').getByTestId('complete-2').click()
  await expect(reopened.getByTestId('completedSetCount')).toHaveText('2 / 9')

  await reopened.getByTestId('finishWorkout').click()
  await reopened.getByRole('button', { name: 'Save completed sets' }).click()
  await expect(reopened.getByTestId('workoutSaved')).toBeVisible()
  await reopened.getByRole('button', { name: 'Continue' }).click()

  await reopened.getByRole('link', { name: 'History' }).click()
  await expect(reopened.getByText('1 saved session', { exact: true })).toBeVisible()
  await expect(reopened.getByTestId('history-Push')).toContainText('1 exercise · 2 working · 0 warm-up')

  // The next session offers the previous values.
  await reopened.getByRole('link', { name: 'Blueprints' }).click()
  await reopened.getByRole('button', { name: /^Push/ }).click()
  await reopened.getByTestId('startWorkout').click()
  await expect(reopened.getByTestId('set-Bench Press-2').getByTestId('previous-2')).toContainText('Previous: 62.5 kg × 6 reps')
  await reopened.context().setOffline(false)
})

test('an unfinished workout is offered for resuming', async ({ page }) => {
  await page.goto('./#/workout/new?freestyle=1')
  await expect(page.getByTestId('addExercise')).toBeVisible()
  await page.getByTestId('addExercise').click()
  await page.getByRole('textbox', { name: 'Custom exercise name' }).fill('Sled Push')
  await page.getByTestId('addCustomExercise').click()
  await expect(page.getByRole('heading', { name: 'Sled Push' })).toBeVisible()
  await page.goto('./')
  await expect(page.getByTestId('resumeWorkout')).toContainText('Freestyle')
  await page.getByTestId('dashboardStartWorkout').click()
  await page.getByTestId('Freestyle strength').click()
  await expect(page.getByRole('alertdialog')).toContainText('Unfinished workout')
  await page.getByRole('button', { name: 'Resume unfinished workout' }).click()
  await expect(page.getByRole('heading', { name: 'Sled Push' })).toBeVisible()
})
