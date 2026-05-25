import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DataTable from '../components/ui/DataTable'

interface Item {
  id: string
  name: string
  value: number
}

const columns = [
  { key: 'name', label: 'Name', render: (i: Item) => i.name, sortable: true, sortValue: (i: Item) => i.name },
  { key: 'value', label: 'Value', render: (i: Item) => i.value, sortable: true, sortValue: (i: Item) => i.value, align: 'right' as const },
]

const data: Item[] = [
  { id: '1', name: 'Alpha', value: 100 },
  { id: '2', name: 'Beta', value: 50 },
  { id: '3', name: 'Gamma', value: 200 },
]

vi.mock('../store/toast', () => {
  const addToast = vi.fn()
  return {
    useToastStore: vi.fn((selector?: (s: { addToast: typeof addToast }) => unknown) => {
      const state = { addToast }
      return selector ? selector(state) : state
    }),
  }
})

describe('DataTable', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders header labels', () => {
    render(<DataTable columns={columns} data={data} />)
    expect(screen.getByText('Name')).toBeDefined()
    expect(screen.getByText('Value')).toBeDefined()
  })

  it('renders all data rows', () => {
    render(<DataTable columns={columns} data={data} />)
    expect(screen.getByText('Alpha')).toBeDefined()
    expect(screen.getByText('Beta')).toBeDefined()
    expect(screen.getByText('Gamma')).toBeDefined()
  })

  it('shows empty message when no data', () => {
    render(<DataTable columns={columns} data={[]} emptyMessage="Nothing here" />)
    expect(screen.getByText('Nothing here')).toBeDefined()
  })

  it('sorts ascending on header click', () => {
    render(<DataTable columns={columns} data={data} />)
    fireEvent.click(screen.getByText('Value'))
    const cells = screen.getAllByText(/50|100|200/)
    expect(cells[0].textContent).toBe('50')
  })

  it('toggles sort direction on second click', () => {
    render(<DataTable columns={columns} data={data} />)
    fireEvent.click(screen.getByText('Value'))
    fireEvent.click(screen.getByText(/^Value/))
    const cells = screen.getAllByText(/50|100|200/)
    expect(cells[0].textContent).toBe('200')
  })

  it('filters rows by search query', () => {
    render(<DataTable columns={columns} data={data} searchable={true} />)
    const input = screen.getByPlaceholderText('Search...')
    fireEvent.change(input, { target: { value: 'Beta' } })
    expect(screen.getByText('Beta')).toBeDefined()
    expect(screen.queryByText('Alpha')).toBeNull()
  })

  it('shows filtered subset when searching', () => {
    render(<DataTable columns={columns} data={data} searchable={true} />)
    const input = screen.getByPlaceholderText('Search...')
    fireEvent.change(input, { target: { value: 'Beta' } })
    expect(screen.getByText('Beta')).toBeDefined()
    expect(screen.queryByText('Alpha')).toBeNull()
    expect(screen.queryByText('Gamma')).toBeNull()
  })

  it('calls onRowClick when row clicked', () => {
    const onRowClick = vi.fn()
    render(<DataTable columns={columns} data={[data[0]]} onRowClick={onRowClick} />)
    fireEvent.click(screen.getByText('Alpha'))
    expect(onRowClick).toHaveBeenCalledWith(data[0])
  })

  it('renders CSV export button', () => {
    render(<DataTable columns={columns} data={data} exportable={true} />)
    expect(screen.getByText('CSV')).toBeDefined()
  })

  it('renders column visibility toggle button', () => {
    render(<DataTable columns={columns} data={data} columnVisibility={true} />)
    expect(screen.getByText('Cols')).toBeDefined()
  })

  it('toggles column visibility menu', () => {
    render(<DataTable columns={columns} data={data} columnVisibility={true} />)
    fireEvent.click(screen.getByText('Cols'))
    expect(screen.getAllByText('Name').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Value').length).toBeGreaterThanOrEqual(2)
  })

  it('hides search when searchable=false', () => {
    render(<DataTable columns={columns} data={data} searchable={false} />)
    expect(screen.queryByPlaceholderText('Search...')).toBeNull()
  })
})
