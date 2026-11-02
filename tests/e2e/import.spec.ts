import { expect, test } from '@playwright/test'
import { completeCSV, legacyBackup } from '../../src/test/legacyBackup'

test.use({ locale: 'en-US' })

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    const key = 'motion.onboarding.v1.motion-local'
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ status: 'skipped', profileStepDone: true }))
  })
})

test('imports the CSV v18 export of the iOS app with preview, report and duplicate notice', async ({ page }) => {
  await page.goto('./#/settings')
  await expect(page.getByTestId('opening')).toBeHidden({ timeout: 5_000 })
  const hint = page.getByTestId('install-hint')
  if (await hint.isVisible()) await hint.getByRole('button', { name: 'Not now' }).first().click()

  await page.getByTestId('importBackup').click()
  const csv = { name: 'MotionBackup.csv', mimeType: 'text/csv', buffer: Buffer.from(completeCSV(legacyBackup())) }
  await page.getByTestId('importFile').setInputFiles(csv)
  const preview = page.getByTestId('importPreview')
  await expect(preview).toContainText('1 workout from Apple Health or Strava is skipped.')
  await expect(page.getByTestId('count-workouts').locator('td')).toHaveText(['1', '1', '0'])
  await expect(preview).toContainText('40 kg × 10 (Warm-up) · 82.5 kg × 7')

  await page.getByTestId('confirmImport').click()
  await expect(page.getByTestId('importReport')).toContainText('Import finished')
  await expect(page.getByTestId('count-xp')).toContainText('200')
  await page.getByTestId('importDone').click()

  await page.getByTestId('importBackup').click()
  await page.getByTestId('importFile').setInputFiles({ ...csv, name: 'Motion-Backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(legacyBackup())) })
  await expect(page.getByTestId('alreadyImported')).toBeVisible()

  await page.getByTestId('importFile').setInputFiles({ name: 'old.csv', mimeType: 'text/csv', buffer: Buffer.from('motion_backup_v12,key,date\n') })
  await expect(page.getByTestId('importError')).toContainText('older Motion CSV file')
})
