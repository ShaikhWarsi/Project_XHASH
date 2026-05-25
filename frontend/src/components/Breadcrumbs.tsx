import { useLocation, Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { getRouteLabel, GROUP_LABELS } from '../utils/routes'

const PARENT_LABELS: Record<string, string> = {
  markets: 'Markets',
  trading: 'Trading',
  risk: 'Risk',
  strategy: 'Strategy',
  ai: 'AI & Strategies',
  research: 'Research',
  data: 'Data',
  settings: 'Settings',
}

export default function Breadcrumbs() {
  const location = useLocation()
  const parts = location.pathname.split('/').filter(Boolean)

  if (parts.length === 0) return null

  const crumbs: { path: string; label: string }[] = []
  if (parts.length >= 1 && parts[0] !== '') {
    crumbs.push({ path: '/', label: 'Dashboard' })
  }
  for (let i = 0; i < parts.length; i++) {
    const segment = parts[i]
    const path = '/' + parts.slice(0, i + 1).join('/')
    const isLast = i === parts.length - 1
    const parentLabel = PARENT_LABELS[segment]
    if (parentLabel && !isLast) {
      crumbs.push({ path: '', label: parentLabel })
    } else {
      crumbs.push({ path, label: getRouteLabel(path) })
    }
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 mb-2 font-mono text-[10px]">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={10} className="opacity-40" style={{ color: 'var(--text-muted)' }} />}
          {crumb.path ? (
            <Link to={crumb.path} className="no-underline cursor-pointer" style={{ color: 'var(--text-muted)' }}>
              {crumb.label}
            </Link>
          ) : (
            <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
