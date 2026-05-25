import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import Skeleton from '../components/Skeleton'

describe('Skeleton', () => {
  it('renders a single skeleton by default', () => {
    const { container } = render(<Skeleton />)
    expect(container.children.length).toBe(1)
  })

  it('renders multiple skeletons when count is set', () => {
    const { container } = render(<Skeleton count={3} />)
    expect(container.children.length).toBe(3)
  })

  it('renders circle variant', () => {
    const { container } = render(<Skeleton variant="circle" height={40} />)
    const skeleton = container.firstChild as HTMLElement
    expect(skeleton).toBeDefined()
  })
})
