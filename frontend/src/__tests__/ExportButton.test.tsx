import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ExportButton from '../components/ui/ExportButton'

vi.mock('../store/toast', () => ({
  useToastStore: vi.fn((selector?: (s: { addToast: (...args: unknown[]) => unknown }) => unknown) => {
    const state = { addToast: vi.fn() }
    return selector ? selector(state) : state
  }),
}))

describe('ExportButton', () => {
  it('renders with default label', () => {
    render(<ExportButton data={[]} />)
    expect(screen.getByText('CSV')).toBeDefined()
  })

  it('renders with custom label', () => {
    render(<ExportButton data={[]} label="Download" />)
    expect(screen.getByText('Download')).toBeDefined()
  })

  it('triggers download when data exists', () => {
    const createSpy = vi.spyOn(document, 'createElement')
    render(<ExportButton data={[{ symbol: 'AAPL', price: 150 }]} />)
    fireEvent.click(screen.getByText('CSV'))
    expect(createSpy).toHaveBeenCalled()
  })

  it('renders download icon', () => {
    const { container } = render(<ExportButton data={[]} />)
    expect(container.querySelector('svg')).toBeDefined()
  })
})
