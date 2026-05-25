import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider, useTheme } from '../contexts/ThemeContext'

vi.stubGlobal('localStorage', {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
})

function TestComponent() {
  const { theme, resolvedTheme, setTheme, cycleTheme, density, setDensity, fontSize, setFontSize } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved-theme">{resolvedTheme}</span>
      <span data-testid="density">{density}</span>
      <span data-testid="fontsize">{fontSize}</span>
      <button data-testid="set-theme" onClick={() => setTheme('cyber')}>Set Cyber</button>
      <button data-testid="cycle-theme" onClick={cycleTheme}>Cycle</button>
      <button data-testid="set-density" onClick={() => setDensity('compact')}>Compact</button>
      <button data-testid="set-fontsize" onClick={() => setFontSize(16)}>Font 16</button>
    </div>
  )
}

describe('ThemeContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('provides default theme values', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('theme').textContent).toBe('classic')
    expect(screen.getByTestId('density').textContent).toBe('normal')
  })

  it('resolvedTheme matches theme when not auto', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('resolved-theme').textContent).toBe('classic')
  })

  it('setTheme updates theme', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    )
    fireEvent.click(screen.getByTestId('set-theme'))
    expect(screen.getByTestId('theme').textContent).toBe('cyber')
    expect(screen.getByTestId('resolved-theme').textContent).toBe('cyber')
  })

  it('cycleTheme cycles through themes including auto', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    )
    fireEvent.click(screen.getByTestId('cycle-theme'))
    expect(screen.getByTestId('theme').textContent).toBe('matrix')
    fireEvent.click(screen.getByTestId('cycle-theme'))
    expect(screen.getByTestId('theme').textContent).toBe('amber')
    fireEvent.click(screen.getByTestId('cycle-theme'))
    expect(screen.getByTestId('theme').textContent).toBe('cyber')
  })

  it('setDensity updates density', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    )
    fireEvent.click(screen.getByTestId('set-density'))
    expect(screen.getByTestId('density').textContent).toBe('compact')
  })

  it('setFontSize updates fontSize', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    )
    fireEvent.click(screen.getByTestId('set-fontsize'))
    expect(screen.getByTestId('fontsize').textContent).toBe('16')
  })

  it('throws without ThemeProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TestComponent />)).toThrow('useTheme must be used within ThemeProvider')
    spy.mockRestore()
  })
})
