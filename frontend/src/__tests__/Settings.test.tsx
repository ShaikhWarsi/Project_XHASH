import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import Settings from '../pages/Settings'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: { llm_provider: 'anthropic', data_providers: { finnhub: true }, api_key_configured: true, max_position_size_pct: 15, max_leverage: 2, max_drawdown_pct: 20, stop_loss_atr: 2 } }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    defaults: { headers: { common: {} } },
  },
  setApiKey: vi.fn(),
}))

const mockWorkflowState = {
  workflows: [],
  runs: {},
  loading: false,
  error: null,
  runningId: null,
  pollInterval: null,
  load: vi.fn(),
  loadRuns: vi.fn(),
  triggerRun: vi.fn(),
  startPolling: vi.fn(),
  stopPolling: vi.fn(),
  refreshRuns: vi.fn(),
}

vi.mock('../store/workflows', () => ({
  useWorkflowStore: vi.fn((selector?: any) => selector ? selector(mockWorkflowState) : mockWorkflowState),
}))

const mockToastState = { toasts: [], addToast: vi.fn(), removeToast: vi.fn() }

vi.mock('../store/toast', () => ({
  useToastStore: vi.fn((selector?: any) => selector ? selector(mockToastState) : mockToastState),
}))

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: vi.fn(() => ({
    theme: 'classic',
    setTheme: vi.fn(),
    cycleTheme: vi.fn(),
    density: 'normal',
    setDensity: vi.fn(),
    fontSize: 14,
    setFontSize: vi.fn(),
  })),
}))

vi.mock('../contexts/WorkspaceContext', () => ({
  useWorkspace: vi.fn(() => ({
    saveWorkspace: vi.fn(),
    loadWorkspace: vi.fn(),
    listWorkspaces: vi.fn(() => []),
    deleteWorkspace: vi.fn(),
    currentWorkspace: null,
  })),
}))

describe('Settings', () => {
  it('renders settings page after loading', async () => {
    render(
      <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => expect(screen.getByText('Settings')).toBeDefined())
  })

  it('shows theme options after loading', async () => {
    render(
      <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => {
      expect(screen.getByText('Classic Dark')).toBeDefined()
      expect(screen.getByText('Matrix Green')).toBeDefined()
      expect(screen.getByText('Amber Glow')).toBeDefined()
      expect(screen.getByText('Cyber Neon')).toBeDefined()
    })
  })

  it('shows API configuration section after loading', async () => {
    render(
      <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => {
      expect(screen.getByText('API Configuration')).toBeDefined()
      expect(screen.getByText('API Key')).toBeDefined()
    })
  })
})
