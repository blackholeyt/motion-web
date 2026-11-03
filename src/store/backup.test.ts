import { freshDatabase } from '../test/db'
import { buildBackup } from './backup'
import { checkIn } from './body'
import { createExercise } from './library'

describe('JSON backup', () => {
  beforeEach(freshDatabase)

  it('includes every synced table with its records', async () => {
    await createExercise('Bench Press', true)
    await checkIn(72, new Date('2026-11-02T07:00:00'))
    const backup = await buildBackup(new Date('2026-11-02T08:00:00Z'))
    expect(backup).toMatchObject({ format: 'motion-web-backup', version: 1, exported_at: '2026-11-02T08:00:00.000Z' })
    expect(Object.keys(backup.tables)).toHaveLength(12)
    expect(backup.tables.exercises).toHaveLength(1)
    expect(backup.tables.body_weights).toHaveLength(1)
    expect(backup.tables.weight_rewards).toHaveLength(1)
    expect(backup.tables.profiles).toHaveLength(1)
  })
})
