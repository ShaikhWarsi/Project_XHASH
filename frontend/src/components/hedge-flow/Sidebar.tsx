import { Brain, Shield, Eye, TrendingUp, Percent, User, BarChart3, Sparkles, Wallet } from 'lucide-react'

const agentTemplates = [
  { type: 'input', label: 'Stock Input', icon: BarChart3, color: 'blue', description: 'Add tickers and config' },
  { type: 'agent', label: 'Warren Buffett', key: 'warren_buffett', icon: Brain, color: 'green', description: 'Value / Moat' },
  { type: 'agent', label: 'Ben Graham', key: 'ben_graham', icon: Shield, color: 'blue', description: 'Deep Value' },
  { type: 'agent', label: 'Charlie Munger', key: 'charlie_munger', icon: Brain, color: 'purple', description: 'Mental Models' },
  { type: 'agent', label: 'Michael Burry', key: 'michael_burry', icon: Eye, color: 'red', description: 'Contrarian' },
  { type: 'agent', label: 'Peter Lynch', key: 'peter_lynch', icon: Percent, color: 'green', description: 'GARP' },
  { type: 'agent', label: 'Bill Ackman', key: 'bill_ackman', icon: TrendingUp, color: 'blue', description: 'Activist' },
  { type: 'agent', label: 'Stanley Druckenmiller', key: 'stanley_druckenmiller', icon: TrendingUp, color: 'blue', description: 'Macro' },
  { type: 'agent', label: 'Cathie Wood', key: 'cathie_wood', icon: Sparkles, color: 'purple', description: 'Innovation' },
  { type: 'agent', label: 'Nassim Taleb', key: 'nassim_taleb', icon: Shield, color: 'yellow', description: 'Tail Risk' },
  { type: 'agent', label: 'Mohnish Pabrai', key: 'mohnish_pabrai', icon: User, color: 'purple', description: 'Clone' },
  { type: 'agent', label: 'Phil Fisher', key: 'phil_fisher', icon: Brain, color: 'green', description: 'Growth Quality' },
  { type: 'agent', label: 'Aswath Damodaran', key: 'aswath_damodaran', icon: Percent, color: 'blue', description: 'DCF' },
  { type: 'agent', key: 'rakesh_jhunjhunwala', label: 'Rakesh Jhunjhunwala', icon: User, color: 'green', description: 'EM Value' },
  { type: 'output', label: 'Portfolio Manager', subtype: 'portfolio', icon: Wallet, color: 'green', description: 'Final decision' },
]

const colorMap: Record<string, string> = {
  green: 'bg-green-500/10 text-green-400 border-green-500/20',
  red: 'bg-red-500/10 text-red-400 border-red-500/20',
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

export default function HedgeFlowSidebar({ onDrop }: { onDrop: (template: typeof agentTemplates[0]) => void }) {
  return (
    <div className="w-56 bg-[#151821] border-r border-[#2a2d3e] p-3 overflow-y-auto shrink-0">
      <div className="text-xs font-semibold text-[#9aa0a6] uppercase tracking-wider mb-3">Components</div>
      <div className="space-y-1">
        {agentTemplates.map((t) => {
          const Icon = t.icon
          return (
            <div
              key={t.key || t.label}
              onClick={() => onDrop(t)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#2a2d3e] cursor-pointer transition-colors"
            >
              <div className={`w-6 h-6 rounded flex items-center justify-center ${colorMap[t.color]}`}>
                <Icon className="w-3 h-3" />
              </div>
              <div>
                <div className="text-[11px] font-medium text-white">{t.label}</div>
                <div className="text-[10px] text-[#5f6368]">{t.description}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
