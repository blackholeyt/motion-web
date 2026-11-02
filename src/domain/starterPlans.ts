import { catalogue, type CatalogueMovement } from './catalogueData'

/** StarterPlans.swift: six general templates; all targets stay editable after copying. */
export type PlanEquipment = 'Dumbbells & bench' | 'Machines & cables' | 'Full gym'
export const planEquipment: PlanEquipment[] = ['Dumbbells & bench', 'Machines & cables', 'Full gym']

export interface StarterPlan {
  id: string
  name: string
  equipment: PlanEquipment
  minutes: number
  sets: number
  movementIDs: string[]
  detail: string
  summary: string
}

export const starterPlans: StarterPlan[] = [
  {
    id: 'full-quick', name: 'Full Body · Start Simple', equipment: 'Machines & cables', minutes: 20, sets: 1,
    movementIDs: ['legpress', 'curl-leg', 'chest-machine', 'pulldown', 'calf', 'plank'],
    detail: 'Beginner-friendly, one working set per movement. Machines, cable station and floor space. A full-body starting session; adjust exercises and rest to your needs.',
    summary: 'A simple introduction to full-body training',
  },
  {
    id: 'full-machines', name: 'Full Body · Machines', equipment: 'Machines & cables', minutes: 35, sets: 2,
    movementIDs: ['legpress', 'curl-leg', 'chest-machine', 'pulldown', 'calf', 'plank'],
    detail: 'Two working sets across the body. Requires machines, a cable station and floor space.',
    summary: 'Full-body training with guided movements',
  },
  {
    id: 'full-dumbbells', name: 'Full Body · Dumbbells', equipment: 'Dumbbells & bench', minutes: 30, sets: 2,
    movementIDs: ['goblet', 'split', 'db-press', 'db-row', 'plank'],
    detail: 'A compact full-body starting session with dumbbells, a stable bench and floor space. For split squats and rows, do each side.',
    summary: 'Full-body training with compact equipment',
  },
  {
    id: 'push', name: 'Push', equipment: 'Full gym', minutes: 35, sets: 3,
    movementIDs: ['bench', 'ohp', 'pushdown'],
    detail: 'Split-style session for chest, shoulders and triceps. Requires a barbell, bench, rack and cable station. Pair with other sessions covering the rest of the body.',
    summary: 'Chest, shoulders & triceps',
  },
  {
    id: 'pull', name: 'Pull', equipment: 'Full gym', minutes: 35, sets: 3,
    movementIDs: ['deadlift', 'row', 'pulldown'],
    detail: 'Split-style pulling session. Requires a barbell and cable station; review technique for the deadlift and row. Pair with Push and Legs or your own complementary sessions.',
    summary: 'Back & pulling movements',
  },
  {
    id: 'legs', name: 'Legs', equipment: 'Full gym', minutes: 35, sets: 3,
    movementIDs: ['squat', 'legpress', 'calf'],
    detail: 'Split-style lower-body session. Requires a barbell, rack and machines. Pair with upper-body sessions.',
    summary: 'Lower-body training',
  },
]

export function planMovements(plan: StarterPlan): CatalogueMovement[] {
  return plan.movementIDs.map((id) => catalogue.find((movement) => movement.id === id)).filter((movement): movement is CatalogueMovement => !!movement)
}

export function shortlist(equipment: PlanEquipment, minutes: number): StarterPlan[] {
  return starterPlans.filter((plan) => (plan.equipment === equipment || equipment === 'Full gym') && plan.minutes <= minutes)
}
