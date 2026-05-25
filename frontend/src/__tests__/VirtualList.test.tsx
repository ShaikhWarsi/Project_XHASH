import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import VirtualList from '../components/VirtualList'

vi.stubGlobal('ResizeObserver', class {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
})

describe('VirtualList', () => {
  const items = Array.from({ length: 100 }, (_, i) => ({ id: i, label: `Item ${i}` }))

  it('renders visible items', async () => {
    render(
      <VirtualList
        items={items}
        itemHeight={30}
        maxHeight={300}
        renderItem={(item) => <div>{item.label}</div>}
      />,
    )
    expect(await screen.findByText('Item 0')).toBeDefined()
    expect(await screen.findByText('Item 5')).toBeDefined()
  })

  it('renders nothing when items empty', () => {
    const { container } = render(
      <VirtualList
        items={[]}
        itemHeight={30}
        maxHeight={200}
        renderItem={() => <div>x</div>}
      />,
    )
    expect(container.textContent).toBe('')
  })

  it('accepts custom keyExtractor', async () => {
    render(
      <VirtualList
        items={[{ id: 42, label: 'Custom key' }]}
        itemHeight={30}
        maxHeight={100}
        keyExtractor={(item) => String(item.id)}
        renderItem={(item) => <div>{item.label}</div>}
      />,
    )
    expect(await screen.findByText('Custom key')).toBeDefined()
  })

  it('forwards ref as container element', async () => {
    const ref = { current: null }
    render(
      <VirtualList
        ref={ref}
        items={[{ label: 'Ref test' }]}
        itemHeight={30}
        maxHeight={100}
        renderItem={(item) => <div>{item.label}</div>}
      />,
    )
    await screen.findByText('Ref test')
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })
})
