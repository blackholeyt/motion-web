import type { Page } from '@playwright/test'

/**
 * Workouts open in the minimal focus view. Tests of the full list (all exercises and set rows,
 * exercise options, notes) switch to it first. Safe to call when it is already showing.
 */
export async function showFullView(page: Page) {
  const toggle = page.getByTestId('viewToggle')
  if ((await toggle.getAttribute('data-view')) === 'focus') await toggle.click()
  await page.getByTestId('workoutNotes').waitFor()
}

/**
 * Settings sit in the sidebar on wide screens; phones open them from the gear on the dashboard,
 * so go through the dashboard first.
 */
export async function openSettings(page: Page) {
  await page.getByRole('link', { name: 'Dashboard' }).click()
  await page.getByRole('link', { name: 'Settings' }).click()
}
