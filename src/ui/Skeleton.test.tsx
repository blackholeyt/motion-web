import { render, screen } from '@testing-library/react'
import { updateSettings } from '../settings/deviceSettings'
import { Loading, SkeletonBlock } from './Skeleton'

describe('loading placeholders', () => {
  beforeEach(() => updateSettings({ language: 'en' }))

  it('announces loading once and hides the shapes from screen readers', () => {
    render(
      <Loading>
        <SkeletonBlock height={20} testID="shape" />
        <SkeletonBlock height={40} />
      </Loading>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
    expect(screen.getByTestId('loading')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByTestId('shape')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByTestId('shape')).toHaveStyle({ height: '20px' })
  })
})
