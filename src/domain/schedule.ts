import type { TrainingPlanTicket } from '../data/types'
import { addDays, dayKey, startOfDay } from './measurement'

/*
 * TrainingSchedule.swift ported 1:1. Weekdays follow Apple's calendar: 1 = Sunday … 7 = Saturday.
 * Calendar calculations have no persistence or workout-history dependencies.
 */

export interface TrainingPlanEntry {
  id: string
  blueprintID: string
  weekday?: number | null
}

export interface TrainingSchedule {
  id: string
  revision: string
  enabled: boolean
  mode: 'rotation' | 'weekdays'
  startDate: string
  entries: TrainingPlanEntry[]
  weekdays: number[]
  cursor: number
  rotationToken: string
  notBefore: string | null
  consumed: string[]
}

export function newSchedule(now = new Date()): TrainingSchedule {
  return {
    id: crypto.randomUUID(),
    revision: crypto.randomUUID(),
    enabled: false,
    mode: 'rotation',
    startDate: now.toISOString(),
    entries: [],
    weekdays: [],
    cursor: 0,
    rotationToken: crypto.randomUUID(),
    notBefore: null,
    consumed: [],
  }
}

export const appleWeekday = (date: Date) => date.getDay() + 1

export const ticketID = (ticket: TrainingPlanTicket) => `${ticket.entryID}/${ticket.rotationToken ?? ticket.dayKey}`

export function structurallyValid(state: TrainingSchedule): boolean {
  const ids = new Set(state.entries.map((entry) => entry.id))
  const fixedDays = state.entries.map((entry) => entry.weekday).filter((day): day is number => day != null)
  return (
    state.entries.length <= 100 &&
    ids.size === state.entries.length &&
    state.weekdays.every((day) => day >= 1 && day <= 7) &&
    state.entries.every((entry) => entry.weekday == null || (entry.weekday >= 1 && entry.weekday <= 7)) &&
    state.cursor >= 0 &&
    (state.entries.length === 0 ? state.cursor === 0 : state.cursor < state.entries.length) &&
    !Number.isNaN(Date.parse(state.startDate)) &&
    (state.notBefore === null || !Number.isNaN(Date.parse(state.notBefore))) &&
    state.consumed.length <= 100_000 &&
    (state.mode !== 'weekdays' ||
      (state.entries.every((entry) => entry.weekday != null) && new Set(fixedDays).size === state.entries.length))
  )
}

export function nextTicket(state: TrainingSchedule, now: Date): TrainingPlanTicket | null {
  if (!state.enabled || !structurallyValid(state) || state.entries.length === 0) return null
  let date = new Date(Math.max(startOfDay(now).getTime(), startOfDay(new Date(state.startDate)).getTime()))
  if (state.mode === 'rotation' && state.notBefore) {
    date = new Date(Math.max(date.getTime(), startOfDay(new Date(state.notBefore)).getTime()))
  }
  const consumed = new Set(state.consumed)
  // Each consumed fixed slot can exclude at most one candidate day.
  for (let step = 0; step < (state.consumed.length + 2) * 7; step++) {
    const weekday = appleWeekday(date)
    const entry =
      state.mode === 'rotation'
        ? state.weekdays.length === 0 || state.weekdays.includes(weekday)
          ? state.entries[state.cursor]
          : undefined
        : state.entries.find((candidate) => candidate.weekday === weekday)
    if (entry) {
      const ticket: TrainingPlanTicket = {
        planID: state.id,
        revision: state.revision,
        entryID: entry.id,
        rotationToken: state.mode === 'rotation' ? state.rotationToken : null,
        date: date.toISOString(),
        dayKey: dayKey(date),
      }
      if (state.mode === 'rotation' || !consumed.has(ticketID(ticket))) return ticket
    }
    date = addDays(date, 1)
  }
  return null
}

/** Returns the advanced schedule, or null when the ticket no longer matches the plan. */
export function consume(state: TrainingSchedule, ticket: TrainingPlanTicket, now: Date): TrainingSchedule | null {
  if (!state.enabled || !structurallyValid(state) || ticket.planID !== state.id || ticket.revision !== state.revision) return null
  const entry = state.entries.find((candidate) => candidate.id === ticket.entryID)
  if (!entry) return null
  if (state.mode === 'rotation') {
    if (entry.id !== state.entries[state.cursor]?.id || ticket.rotationToken !== state.rotationToken) return null
    const next = { ...state, cursor: (state.cursor + 1) % state.entries.length, rotationToken: crypto.randomUUID() }
    if (state.weekdays.length > 0) {
      const base = Math.max(startOfDay(now).getTime(), startOfDay(new Date(ticket.date)).getTime())
      next.notBefore = addDays(new Date(base), 1).toISOString()
    }
    return next
  }
  if (ticket.rotationToken !== null || state.consumed.includes(ticketID(ticket))) return null
  return { ...state, consumed: [...state.consumed, ticketID(ticket)] }
}

/** Saving changed assignments disconnects outstanding tickets, as in TrainingPlanEditor.swift. */
export function withEditedRevision(original: TrainingSchedule | null, edited: TrainingSchedule): TrainingSchedule {
  if (!original) return edited
  const changed =
    original.mode !== edited.mode ||
    JSON.stringify(original.entries) !== JSON.stringify(edited.entries) ||
    JSON.stringify([...original.weekdays].sort()) !== JSON.stringify([...edited.weekdays].sort()) ||
    original.startDate !== edited.startDate ||
    original.cursor !== edited.cursor
  if (!changed) return edited
  return { ...edited, revision: crypto.randomUUID(), rotationToken: crypto.randomUUID(), notBefore: null, consumed: [] }
}
