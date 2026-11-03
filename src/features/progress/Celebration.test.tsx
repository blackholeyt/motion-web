import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { xpAward, type WorkoutRecap } from '../../domain/progress'
import type { TrainingWeek } from '../../domain/statistics'
import { updateSettings } from '../../settings/deviceSettings'
import { Celebration, durationLabel, type CelebrationProps } from './Celebration'

const recap: WorkoutRecap = {
  name: 'Push', setCount: 6, warmUpCount: 1, comparableCount: 2, consistencyDays: 3, improvedExerciseCount: 1, bonusExerciseCount: 0,
  improvements: [{ id: 'b', name: 'Bench', previous: 60, weight: 62.5 }],
  records: [{ id: 'b', name: 'Bench', previous: 60, weight: 62.5, goal: null }],
  repImprovements: [],
}
const weeks: TrainingWeek[] = [40, 41, 42, 43, 44, 45].map((number, index) => ({ start: new Date(), end: new Date(), number, workouts: index === 5 ? 2 : 1, isCurrent: index === 5 }))

function show(overrides: Partial<CelebrationProps> = {}) {
  const onContinue = vi.fn()
  render(
    <Celebration
      name="Push"
      stats={[{ label: 'Duration', value: '48 min' }, { label: 'Working sets', value: '6', detail: '+1 warm-up' }]}
      recap={recap}
      award={xpAward(0, 1)}
      totalXP={500}
      weeks={weeks}
      unit="kg"
      onContinue={onContinue}
      {...overrides}
    />,
  )
  return onContinue
}

const current = () => screen.getByTestId('celebration').dataset.screen

describe('finish screens', () => {
  beforeEach(() => updateSettings({ language: 'en' }))

  it('steps through every screen and finishes on the last', async () => {
    const onContinue = show()
    expect(current()).toBe('summary')
    expect(screen.getByTestId('finishStats')).toHaveTextContent('48 min')
    expect(screen.getByTestId('finishStep')).toHaveTextContent('Screen 1 of 4')
    await userEvent.click(screen.getByTestId('celebrationNext'))
    expect(current()).toBe('xp')
    await userEvent.click(screen.getByTestId('celebrationNext'))
    expect(current()).toBe('highlights')
    expect(screen.getByTestId('highlight')).toHaveAttribute('data-kind', 'record')
    expect(screen.getByTestId('highlight')).toHaveTextContent('Load record')
    await userEvent.click(screen.getByTestId('celebrationNext'))
    expect(current()).toBe('week')
    expect(screen.getByRole('img', { name: /Week 45: 2/ })).toBeInTheDocument()
    expect(screen.getByTestId('celebrationSkip')).not.toBeVisible()
    expect(onContinue).not.toHaveBeenCalled()
    await userEvent.click(screen.getByTestId('celebrationContinue'))
    expect(onContinue).toHaveBeenCalledOnce()
  })

  it('skips straight to the end', async () => {
    const onContinue = show()
    await userEvent.click(screen.getByTestId('celebrationSkip'))
    expect(onContinue).toHaveBeenCalledOnce()
  })

  it('follows horizontal swipes and arrow keys, but not vertical drags', () => {
    show()
    const body = screen.getByTestId('finishScreen')
    const drag = (fromX: number, toX: number, toY = 300) => {
      fireEvent.pointerDown(body, { clientX: fromX, clientY: 300 })
      fireEvent.pointerUp(body, { clientX: toX, clientY: toY })
    }
    drag(300, 100)
    expect(current()).toBe('xp')
    drag(100, 300)
    expect(current()).toBe('summary')
    drag(300, 240, 500)
    expect(current()).toBe('summary')
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(current()).toBe('xp')
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(current()).toBe('summary')
  })

  it('shows cardio without strength screens', () => {
    show({ recap: null, weeks: weeks.map((week) => ({ ...week, workouts: week.isCurrent ? 1 : 0 })), note: 'No improvement claim.' })
    expect(screen.getByTestId('finishStep')).toHaveTextContent('Screen 1 of 2')
    expect(screen.getByText('No improvement claim.')).toBeInTheDocument()
  })

  it('formats durations compactly', () => {
    expect(durationLabel(20)).toBe('1 min')
    expect(durationLabel(48 * 60)).toBe('48 min')
    expect(durationLabel(65 * 60)).toBe('1 h 05 min')
  })
})
