import type { Exercise } from '../data/types'
import { catalogue, type CatalogueMovement } from './catalogueData'

export { catalogue, type CatalogueMovement }

export const equipmentOptions = ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight', 'Other']
export const muscleOptions = ['Chest', 'Back', 'Shoulders', 'Legs', 'Posterior chain', 'Calves', 'Arms', 'Core', 'Other']

export interface ExerciseFilter {
  search: string
  equipment: string
  muscle: string
  measurement: string
}

export const emptyFilter: ExerciseFilter = { search: '', equipment: '', muscle: '', measurement: '' }

interface Searchable {
  name: string
  equipment: string
  muscle: string
  guidance: string
  measurement: string
}

/** ExerciseCatalogue.matches: filters plus a case-insensitive full-text search. */
export function matches(item: Searchable, filter: ExerciseFilter): boolean {
  const search = filter.search.trim().toLocaleLowerCase()
  return (
    (!filter.equipment || item.equipment === filter.equipment) &&
    (!filter.muscle || item.muscle === filter.muscle) &&
    (!filter.measurement || item.measurement === filter.measurement) &&
    (!search || [item.name, item.equipment, item.muscle, item.guidance].join(' ').toLocaleLowerCase().includes(search))
  )
}

export const supportsLogging = (exercise: Pick<Exercise, 'measurement'>) => exercise.measurement !== 'Distance & duration'

export const sameName = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0
