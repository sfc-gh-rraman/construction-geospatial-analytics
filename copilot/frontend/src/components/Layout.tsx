import { ReactNode } from 'react'
import { 
  Truck, 
  Map, 
  BarChart3, 
  Brain, 
  GitBranch,
  MessageSquare
} from 'lucide-react'

interface LayoutProps {
  children: ReactNode
  currentPage: string
  onNavigate: (page: any) => void
}

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const navItems = [
    { id: 'command', label: 'Command Center', icon: MessageSquare },
    { id: 'fleet', label: 'Fleet Overview', icon: Truck },
    { id: 'map', label: 'Site Map', icon: Map },
    { id: 'ml', label: 'ML Insights', icon: BarChart3 },
    { id: 'architecture', label: 'Architecture', icon: GitBranch },
  ]

  return (
    <div className="min-h-screen bg-earth-900 flex">
      {/* Sidebar */}
      <nav className="w-64 bg-earth-800/50 border-r border-earth-700 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-earth-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-amber to-accent-orange flex items-center justify-center">
              <Truck size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-display font-semibold text-stone-200">GroundTruth</h1>
              <p className="text-xs text-stone-500">Construction Analytics</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 p-4">
          <div className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  currentPage === item.id
                    ? 'bg-accent-amber/10 text-accent-amber border border-accent-amber/20'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-earth-700/50'
                }`}
              >
                <item.icon size={18} />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Site Selector */}
        <div className="p-4 border-t border-earth-700">
          <div className="card p-3">
            <p className="text-xs text-stone-500 mb-2">Active Site</p>
            <select className="w-full bg-earth-700 border border-earth-600 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-accent-amber/50">
              <option value="ALPHA">Site ALPHA - Highway 101</option>
              <option value="BETA">Site BETA - Downtown</option>
              <option value="GAMMA">Site GAMMA - Industrial</option>
              <option value="DELTA">Site DELTA - Residential</option>
            </select>
          </div>
        </div>

        {/* System Status */}
        <div className="p-4 border-t border-earth-700">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Brain size={14} className="text-accent-amber" />
              <span className="text-stone-500">ML Models</span>
            </div>
            <span className="text-accent-emerald">3 Active</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent-emerald status-online" />
              <span className="text-stone-500">API Status</span>
            </div>
            <span className="text-accent-emerald">Online</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
