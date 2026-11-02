import 'fake-indexeddb/auto'
import { MotionDatabase, setDatabase } from '../data/db'

/** A fresh in-memory database per test. */
export async function freshDatabase() {
  const database = new MotionDatabase(`test-${crypto.randomUUID()}`)
  setDatabase(database)
  await database.open()
  return database
}
