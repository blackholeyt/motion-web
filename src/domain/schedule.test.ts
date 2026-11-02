import { consume, newSchedule, nextTicket, withEditedRevision, type TrainingSchedule } from './schedule'

// Behaviour from TrainingSchedule.swift. 2026-11-02 is a Monday (Apple weekday 2).
const monday = new Date(2026, 10, 2, 9)

function rotation(extra: Partial<TrainingSchedule> = {}): TrainingSchedule {
  return { ...newSchedule(new Date(2026, 10, 1)), enabled: true, entries: [{ id: 'e1', blueprintID: 'push' }, { id: 'e2', blueprintID: 'pull' }], ...extra }
}

describe('training schedule', () => {
  it('returns nothing while paused or empty', () => {
    expect(nextTicket({ ...rotation(), enabled: false }, monday)).toBeNull()
    expect(nextTicket({ ...rotation(), entries: [] }, monday)).toBeNull()
  })

  it('rotation without days is due today and advances one position', () => {
    const state = rotation()
    const ticket = nextTicket(state, monday)!
    expect(ticket.entryID).toBe('e1')
    expect(ticket.dayKey).toBe('2026-11-02')
    const next = consume(state, ticket, monday)!
    expect(next.cursor).toBe(1)
    expect(nextTicket(next, monday)!.entryID).toBe('e2')
    // A consumed ticket cannot advance twice.
    expect(consume(next, ticket, monday)).toBeNull()
  })

  it('rotation with training days waits for the next training day after completion', () => {
    const state = rotation({ weekdays: [2, 4] }) // Monday and Wednesday
    const ticket = nextTicket(state, monday)!
    const next = consume(state, ticket, monday)!
    const following = nextTicket(next, monday)!
    expect(following.entryID).toBe('e2')
    expect(following.dayKey).toBe('2026-11-04')
  })

  it('missed rotation days keep the same next workout', () => {
    const state = rotation({ weekdays: [2] })
    expect(nextTicket(state, new Date(2026, 10, 12))!.entryID).toBe('e1')
  })

  it('fixed weekdays move to the next scheduled day once consumed', () => {
    const state: TrainingSchedule = { ...newSchedule(new Date(2026, 10, 1)), enabled: true, mode: 'weekdays', entries: [{ id: 'mon', blueprintID: 'push', weekday: 2 }, { id: 'thu', blueprintID: 'legs', weekday: 5 }] }
    const ticket = nextTicket(state, monday)!
    expect(ticket.entryID).toBe('mon')
    const next = consume(state, ticket, monday)!
    expect(nextTicket(next, monday)!.entryID).toBe('thu')
    expect(nextTicket(next, monday)!.dayKey).toBe('2026-11-05')
  })

  it('editing assignments disconnects outstanding tickets', () => {
    const state = rotation()
    const ticket = nextTicket(state, monday)!
    const edited = withEditedRevision(state, { ...state, cursor: 1 })
    expect(edited.revision).not.toBe(state.revision)
    expect(consume(edited, ticket, monday)).toBeNull()
    expect(withEditedRevision(state, { ...state, enabled: false }).revision).toBe(state.revision)
  })
})
