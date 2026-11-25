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
