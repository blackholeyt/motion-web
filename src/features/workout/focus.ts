/** The part of a set row the focus view needs to decide where to go. */
interface Progressable {
  set: { is_completed: boolean; is_skipped: boolean }
}

const isOpen = (row: Progressable) => !row.set.is_completed && !row.set.is_skipped

/** The card to show when the focus view opens: the first set still to do, else the last set. */
export function currentSetIndex(rows: Progressable[]): number {
  const index = rows.findIndex(isOpen)
  return index === -1 ? Math.max(0, rows.length - 1) : index
}

/**
 * Where to go after finishing the set at `from`: the next set still to do, or, when nothing is
 * left below, the first earlier one. -1 when every set is done or skipped.
 */
export function nextOpenIndex(rows: Progressable[], from: number): number {
  const after = rows.findIndex((row, index) => index > from && isOpen(row))
  return after !== -1 ? after : rows.findIndex(isOpen)
}

/** The card index for a scroll position, clamped to the available cards. */
export function indexAtScroll(scrollTop: number, cardHeight: number, count: number): number {
  if (cardHeight <= 0 || count <= 0) return 0
  return Math.min(count - 1, Math.max(0, Math.round(scrollTop / cardHeight)))
}

/** The part of a set row the progress bar groups by. */
interface Groupable {
  exercise: { id: string; superset_group: string | null }
}

/**
 * Consecutive sets of one exercise (or one superset) form a block in the progress bar, so a long
 * workout reads as a few exercises instead of many tiny segments.
 */
export function segmentGroups(rows: Groupable[]): { key: string; indices: number[] }[] {
  const groups: { key: string; indices: number[] }[] = []
  rows.forEach((row, index) => {
    const id = row.exercise.superset_group ? `superset-${row.exercise.superset_group}` : row.exercise.id
    const last = groups[groups.length - 1]
    if (last && last.key.startsWith(`${id}#`)) last.indices.push(index)
    else groups.push({ key: `${id}#${index}`, indices: [index] })
  })
  return groups
}
