import { useLocation, useNavigate } from 'react-router-dom'
import {
  WORKSPACES,
  getActiveWorkspace,
  type WorkspaceConfig,
} from '../utils/routes'
import {
  TrendingUp,
  Zap,
  Command,
  Activity,
  Layers,
} from 'lucide-react'

interface WorkspaceNavBarProps {
  onOpenQuickOrder: () => void
  onOpenCommandPalette?: () => void
}

export default function WorkspaceNavBar({
  onOpenQuickOrder,
  onOpenCommandPalette,
}: WorkspaceNavBarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const currentPath = location.pathname

  const activeWorkspace: WorkspaceConfig = getActiveWorkspace(currentPath)

  return (
    <header className="sticky top-0 z-30 flex flex-col bg-sidebar/95 backdrop-blur-md border-b border-default shrink-0">
      {/* Tier 1: Master Workspaces Bar */}
      <div className="flex items-center justify-between h-9 px-3 border-b border-default/75">
        {/* Left: Brand + 5 Master Workspaces */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-2 py-1 bg-primary border border-default rounded cursor-pointer select-none shrink-0 hover:border-accent-cyan transition-colors mr-1.5"
            title="Trading Engine Terminal"
          >
            <span className="text-[11px] font-bold text-up font-mono">TE$</span>
            <span className="text-[10px] text-muted font-mono font-medium hidden sm:inline">WORKSTATION</span>
          </div>

          <div className="flex items-center gap-1">
            {WORKSPACES.map((ws) => {
              const isCurrentWs = activeWorkspace.id === ws.id
              return (
                <button
                  key={ws.id}
                  onClick={() => navigate(ws.defaultPath)}
                  className={`px-2.5 py-1 text-[10px] font-mono font-bold tracking-wider rounded transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    isCurrentWs
                      ? 'bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/40 shadow-xs'
                      : 'text-muted hover:text-primary hover:bg-hover border border-transparent'
                  }`}
                >
                  {ws.id === 'markets' && <TrendingUp size={11} />}
                  {ws.id === 'strategy' && <Layers size={11} />}
                  {ws.id === 'ai' && <Zap size={11} />}
                  {ws.id === 'risk' && <Activity size={11} />}
                  <span>{ws.shortLabel}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onOpenQuickOrder}
            className="px-2.5 py-1 text-[10px] font-mono font-bold bg-accent-green hover:bg-accent-green/90 text-black rounded transition-all flex items-center gap-1 cursor-pointer shadow-xs shadow-accent-green/20"
            title="Open Quick Order Ticket (Alt+O)"
          >
            <Zap size={11} />
            <span>TRADE</span>
            <span className="text-[9px] opacity-75 hidden md:inline">Alt+O</span>
          </button>

          {onOpenCommandPalette && (
            <button
              onClick={onOpenCommandPalette}
              className="p-1 text-muted hover:text-primary hover:bg-hover rounded border border-default transition-colors cursor-pointer"
              title="Command Palette (Ctrl+K)"
            >
              <Command size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Tier 2: Contextual Sub-Tabs for Active Workspace */}
      <div className="flex items-center px-3 h-8 bg-primary/40 overflow-x-auto scrollbar-none gap-0.5">
        <span className="text-[9px] font-mono text-muted uppercase tracking-wider mr-1.5 shrink-0 select-none">
          {activeWorkspace.label}:
        </span>
        {activeWorkspace.subtabs.map((tab) => {
          const isActive = currentPath === tab.path
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`px-2.5 py-1 text-[10px] font-mono rounded-xs transition-colors cursor-pointer shrink-0 ${
                isActive
                  ? 'workspace-tab-active font-bold text-accent-cyan bg-card border-b-2 border-accent-cyan'
                  : 'workspace-tab-inactive text-secondary hover:text-primary hover:bg-hover'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </header>
  )
}
