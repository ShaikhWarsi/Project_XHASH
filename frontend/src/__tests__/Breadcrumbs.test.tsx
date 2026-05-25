import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Breadcrumbs from '../components/Breadcrumbs'

vi.mock('../utils/routes', () => ({
  getRouteLabel: vi.fn((path: string) => {
    const labels: Record<string, string> = {
      '/trading/orders': 'Orders',
      '/trading/portfolio': 'Portfolio',
      '/markets/chart': 'Chart',
    }
    return labels[path] || path
  }),
  GROUP_LABELS: {
    trading: 'Trading',
    markets: 'Markets',
    risk: 'Risk',
  },
}))

describe('Breadcrumbs', () => {
  it('renders nothing on root path', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <Breadcrumbs />
      </MemoryRouter>,
    )
    expect(container.textContent).toBe('')
  })

  it('renders dashboard + segment for single-level path', () => {
    render(
      <MemoryRouter initialEntries={['/trading/orders']}>
        <Breadcrumbs />
      </MemoryRouter>,
    )
    expect(screen.getByText('Dashboard')).toBeDefined()
    expect(screen.getByText('Orders')).toBeDefined()
  })

  it('renders parent label and page label for multi-level path', () => {
    render(
      <MemoryRouter initialEntries={['/trading/portfolio']}>
        <Breadcrumbs />
      </MemoryRouter>,
    )
    expect(screen.getByText('Dashboard')).toBeDefined()
    expect(screen.getByText('Portfolio')).toBeDefined()
  })

  it('makes Dashboard a clickable link', () => {
    render(
      <MemoryRouter initialEntries={['/trading/orders']}>
        <Breadcrumbs />
      </MemoryRouter>,
    )
    const link = screen.getByText('Dashboard').closest('a')
    expect(link?.getAttribute('href')).toBe('/')
  })

  it('renders chevron separators between crumbs', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/markets/chart']}>
        <Breadcrumbs />
      </MemoryRouter>,
    )
    expect(container.querySelector('svg')).toBeDefined()
  })
})
