import { 
  LayoutDashboard, 
  Map, 
  Truck, 
  Coffee,
  BookOpen,
  Cpu,
  ChevronLeft,
  ChevronRight,
  Activity,
  Mountain,
  Compass,
  AlertTriangle,
  Brain
} from 'lucide-react'
import { useState } from 'react'
import type { Page } from '../App'

interface LayoutProps {
  children: React.ReactNode
  currentPage: Page
  onNavigate: (page: Page) => void
  selectedSiteId?: string | null
}

const navItems = [
  { id: 'regional' as Page, label: 'Regional Command', icon: LayoutDashboard },
  { id: 'siteops' as Page, label: 'Site Operations', icon: Map },
  { id: 'equipment' as Page, label: 'Equipment Map', icon: Truck },
  { id: 'ghost' as Page, label: 'Ghost Cycle Detection', icon: AlertTriangle },
  { id: 'ml' as Page, label: 'ML Explainability', icon: Brain },
  { id: 'earthwork' as Page, label: 'Earthwork Analytics', icon: Mountain },
  { id: 'brief' as Page, label: 'Daily Site Brief', icon: Coffee },
  { id: 'docs' as Page, label: 'Document Search', icon: BookOpen },
  { id: 'architecture' as Page, label: 'Architecture', icon: Cpu },
]

export function Layout({ children, currentPage, onNavigate, selectedSiteId }: LayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className="h-screen flex overflow-hidden bg-navy-950">
      {/* Sidebar */}
      <aside 
        className={`
          ${isCollapsed ? 'w-16' : 'w-64'} 
          flex-shrink-0 bg-navy-900 border-r border-navy-700/50 
          flex flex-col transition-all duration-300
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-navy-700/50">
          {!isCollapsed && (
            <button 
              onClick={() => onNavigate('landing')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-terra-amber to-terra-orange flex items-center justify-center">
                <Compass size={16} className="text-white" />
              </div>
              <div>
                <span className="font-display font-bold text-lg text-white">TERRA</span>
                <span className="text-xs text-slate-500 block -mt-1">Geospatial Analytics</span>
              </div>
            </button>
          )}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 hover:bg-navy-700 rounded-md text-slate-400 hover:text-white transition-colors"
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = currentPage === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-200 group
                  ${isActive 
                    ? 'bg-terra-amber/10 text-terra-amber' 
                    : 'text-slate-400 hover:text-white hover:bg-navy-700/50'
                  }
                `}
              >
                <item.icon 
                  size={20} 
                  className={isActive ? 'text-terra-amber' : 'text-slate-500 group-hover:text-terra-amber/60'}
                />
                {!isCollapsed && <span>{item.label}</span>}
                {isActive && !isCollapsed && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-terra-amber" />
                )}
              </button>
            )
          })}
        </nav>

        {/* System Status */}
        <div className="p-4 border-t border-navy-700/50">
          {!isCollapsed ? (
            <div className="text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500">System Status</span>
                <span className="flex items-center gap-1 text-terra-green">
                  <Activity size={12} />
                  Online
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <div className="flex -space-x-1">
                  <div className="w-2 h-2 rounded-full bg-terra-green" />
                  <div className="w-2 h-2 rounded-full bg-terra-green" />
                  <div className="w-2 h-2 rounded-full bg-terra-green" />
                  <div className="w-2 h-2 rounded-full bg-terra-green" />
                </div>
                <span>4 Agents Active</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-2 h-2 rounded-full bg-terra-green animate-pulse" />
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Top bar */}
        <header className="h-14 flex-shrink-0 border-b border-navy-700/50 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="font-display font-semibold text-lg text-white">
              {navItems.find(n => n.id === currentPage)?.label || 'TERRA'}
            </h1>
            {selectedSiteId && (
              <div className="flex items-center gap-2 px-3 py-1 bg-terra-amber/10 rounded-full">
                <Map size={14} className="text-terra-amber" />
                <span className="text-sm text-terra-amber">{selectedSiteId}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-terra-green animate-pulse" />
              Snowflake Cortex Connected
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
