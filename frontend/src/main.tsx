import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App'
import { ThemeProvider } from './contexts/ThemeContext'
import { WorkspaceProvider } from './contexts/WorkspaceContext'
import * as Sentry from '@sentry/react'

const dsn = import.meta.env.VITE_SENTRY_DSN
if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 0,
  })
}

window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason
  const msg = error?.message || error?.reason || String(error)
  console.error('[Unhandled Promise Rejection]', msg)
  if (dsn) {
    Sentry.captureException(error)
  }
})

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 2, refetchOnWindowFocus: false } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <WorkspaceProvider>
          <App />
        </WorkspaceProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
