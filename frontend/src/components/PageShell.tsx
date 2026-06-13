import { type ReactNode } from 'react'

interface PageShellProps {
  title: string
  actions?: ReactNode
  children: ReactNode
}

export default function PageShell({ title, actions, children }: PageShellProps) {
  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between min-h-[28px]">
        <h1 className="text-sm font-semibold font-mono-data">{title}</h1>
        {actions && <div className="flex items-center gap-2 text-[11px]">{actions}</div>}
      </div>
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  )
}
