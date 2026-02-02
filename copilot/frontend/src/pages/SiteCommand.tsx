import { useState, useEffect } from 'react'
import { Activity, Fuel, Timer, Percent, TrendingUp, AlertTriangle, Database, Brain, Search, Shield, Truck } from 'lucide-react'
import { Chat } from '../components/Chat'
import { ParameterGauge } from '../components/ParameterGauge'
import { AlertCard } from '../components/AlertCard'

interface SiteMetrics {
  activeEquipment: number
  totalEquipment: number
  fuelBurnRate: number
  idleTimePercent: number
  avgLoadFactor: number
  cycleCount: number
  volumeToday: number
}

interface Alert {
  id: string
  type: 'warning' | 'danger' | 'info' | 'ghost_cycle' | 'choke_point'
  title: string
  message: string
  recommendation?: string
  location?: string
  timestamp: Date
}

interface AgentStatus {
  name: string
  icon: any
  status: 'idle' | 'active' | 'processing'
  lastAction?: string
}

export function SiteCommand() {
  const [metrics, setMetrics] = useState<SiteMetrics>({
    activeEquipment: 42,
    totalEquipment: 48,
    fuelBurnRate: 847.3,
    idleTimePercent: 18.5,
    avgLoadFactor: 72.4,
    cycleCount: 156,
    volumeToday: 8420,
  })

  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      type: 'ghost_cycle',
      title: 'Ghost Cycle Detected',
      message: 'Truck T-15 showing movement but engine load at idle for past 18 minutes.',
      recommendation: 'Check if stuck in traffic at North intersection.',
      location: 'North Haul Road, Sector 3',
      timestamp: new Date(Date.now() - 5 * 60000),
    },
    {
      id: '2',
      type: 'choke_point',
      title: 'Choke Point Alert',
      message: 'Average wait time at Stockpile B intersection increased to 12 minutes.',
      recommendation: 'Consider relocating stockpile 50m east.',
      location: 'Stockpile B Intersection',
      timestamp: new Date(Date.now() - 12 * 60000),
    },
  ])

  const [context, setContext] = useState<any>(null)
  
  const [agents] = useState<AgentStatus[]>([
    { name: 'Orchestrator', icon: Brain, status: 'idle', lastAction: 'Ready' },
    { name: 'Site Historian', icon: Search, status: 'idle', lastAction: 'GPS data indexed' },
    { name: 'Route Advisor', icon: TrendingUp, status: 'idle', lastAction: '7 routes analyzed' },
    { name: 'Fleet Watchdog', icon: Shield, status: 'active', lastAction: 'Monitoring...' },
  ])

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        fuelBurnRate: Math.max(700, Math.min(1000, prev.fuelBurnRate + (Math.random() - 0.5) * 20)),
        idleTimePercent: Math.max(10, Math.min(30, prev.idleTimePercent + (Math.random() - 0.5) * 2)),
        avgLoadFactor: Math.max(60, Math.min(85, prev.avgLoadFactor + (Math.random() - 0.5) * 3)),
        cycleCount: prev.cycleCount + (Math.random() > 0.7 ? 1 : 0),
        volumeToday: prev.volumeToday + Math.floor(Math.random() * 50),
      }))
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const handleDismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }

  const handleContextUpdate = (newContext: any) => {
    setContext(newContext)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-400'
      case 'processing': return 'bg-amber-400 animate-pulse'
      default: return 'bg-slate-500'
    }
  }

  return (
    <div className="h-screen flex flex-col animated-grid-bg">
      {/* Header */}
      <header className="bg-navy-800/80 backdrop-blur border-b border-navy-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-200">Site Command</h1>
            <p className="text-sm text-slate-400">Project Alpha • Active Operations</p>
          </div>
          <div className="flex items-center gap-6">
            {/* Agent Status Indicators */}
            <div className="flex items-center gap-3">
              {agents.map((agent, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy-700/50 border border-navy-600"
                  title={`${agent.name}: ${agent.lastAction}`}
                >
                  <agent.icon size={14} className={agent.status === 'active' ? 'text-emerald-400' : 'text-slate-400'} />
                  <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(agent.status)}`} />
                </div>
              ))}
            </div>
            
            <div className="h-8 w-px bg-navy-700" />
            
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-accent-green rounded-full status-online" />
              <span className="text-sm text-slate-400">Live</span>
            </div>
            
            <div className="text-right">
              <p className="text-2xl font-mono font-semibold text-amber-400 metric-glow">
                {metrics.volumeToday.toLocaleString()} yd³
              </p>
              <p className="text-xs text-slate-400">Volume Today</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Parameters & Alerts */}
        <div className="w-80 border-r border-navy-700/50 flex flex-col overflow-hidden bg-navy-800/30">
          {/* Live Metrics */}
          <div className="p-4 border-b border-navy-700/50">
            <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Activity size={16} className="text-amber-400" />
              Live Metrics
              <div className="ml-auto flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                <span className="text-xs text-amber-400">STREAMING</span>
              </div>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <ParameterGauge
                label="Fuel Burn"
                value={metrics.fuelBurnRate}
                unit="gal/hr"
                min={500}
                max={1200}
                optimal={{ low: 650, high: 850 }}
                trend="up"
                icon={<Fuel size={14} />}
              />
              <ParameterGauge
                label="Idle Time"
                value={metrics.idleTimePercent}
                unit="%"
                min={0}
                max={50}
                optimal={{ low: 5, high: 15 }}
                trend="up"
                icon={<Timer size={14} />}
              />
              <ParameterGauge
                label="Load Factor"
                value={metrics.avgLoadFactor}
                unit="%"
                min={0}
                max={100}
                optimal={{ low: 70, high: 90 }}
                icon={<Percent size={14} />}
              />
              <ParameterGauge
                label="Cycle Count"
                value={metrics.cycleCount}
                unit=""
                min={0}
                max={300}
                trend="up"
                icon={<TrendingUp size={14} />}
                format={(v) => v.toFixed(0)}
              />
            </div>
          </div>

          {/* Equipment Summary */}
          <div className="p-4 border-b border-navy-700/50">
            <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Truck size={16} className="text-cyan-400" />
              Equipment Status
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-accent-green/10 rounded-lg p-2 border border-accent-green/20">
                <p className="text-lg font-mono font-bold text-accent-green">32</p>
                <p className="text-xs text-slate-500">Hauling</p>
              </div>
              <div className="bg-accent-amber/10 rounded-lg p-2 border border-accent-amber/20">
                <p className="text-lg font-mono font-bold text-accent-amber">8</p>
                <p className="text-xs text-slate-500">Idle</p>
              </div>
              <div className="bg-accent-red/10 rounded-lg p-2 border border-accent-red/20">
                <p className="text-lg font-mono font-bold text-accent-red">2</p>
                <p className="text-xs text-slate-500">Maint</p>
              </div>
            </div>
          </div>

          {/* Active Alerts */}
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-400" />
              Active Alerts
              {alerts.length > 0 && (
                <span className="ml-auto px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                  {alerts.length}
                </span>
              )}
            </h3>
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                    <Shield size={24} className="text-emerald-400" />
                  </div>
                  <p className="text-sm text-slate-400">All systems nominal</p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onDismiss={handleDismissAlert}
                  />
                ))
              )}
            </div>
          </div>
          
          {/* System Stats Footer */}
          <div className="p-4 border-t border-navy-700/50 bg-navy-900/50">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Database size={12} className="text-blue-400" />
                <span className="text-slate-500">2.4M GPS points</span>
              </div>
              <div className="flex items-center gap-2">
                <Search size={12} className="text-green-400" />
                <span className="text-slate-500">152 site docs</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center - Chat */}
        <div className="flex-1 flex flex-col">
          <Chat onContextUpdate={handleContextUpdate} />
        </div>

        {/* Right Panel - Context (populated by agent) */}
        <div className="w-80 border-l border-navy-700/50 overflow-y-auto bg-navy-800/30">
          <div className="p-4 border-b border-navy-700/50">
            <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
              Context Panel
              <span className="ml-auto text-xs text-slate-500">Powered by Cortex</span>
            </h3>
          </div>
          
          <div className="p-4">
            {context && Object.keys(context).length > 0 ? (
              <div className="space-y-4 animate-slide-up">
                {context.query_results && (
                  <div className="card card-glow p-4">
                    <h4 className="text-xs text-amber-400 font-medium mb-2 flex items-center gap-2">
                      <TrendingUp size={12} />
                      Query Result
                    </h4>
                    {context.query_results.results && (
                      <div className="text-sm text-slate-300">
                        {context.query_results.results.slice(0, 3).map((row: any, i: number) => (
                          <div key={i} className="py-1 border-b border-navy-700 last:border-0">
                            {Object.entries(row).map(([k, v]) => (
                              <span key={k} className="mr-2">
                                <span className="text-slate-500">{k}:</span>{' '}
                                <span className="text-amber-300 font-mono">{String(v)}</span>
                              </span>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {context.map_data && (
                  <div className="card card-glow p-4">
                    <h4 className="text-xs text-cyan-400 font-medium mb-2 flex items-center gap-2">
                      <Activity size={12} />
                      Location Data
                    </h4>
                    <div className="h-32 bg-navy-700/50 rounded-lg flex items-center justify-center text-slate-500 text-sm">
                      Map visualization placeholder
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-navy-700/50 flex items-center justify-center mx-auto mb-4 relative">
                  <Brain size={28} className="text-slate-600" />
                  <div className="absolute inset-0 rounded-2xl border border-slate-700 animate-pulse" />
                </div>
                <p className="text-slate-400 text-sm">
                  Maps, data, and route analytics will appear here based on your conversation.
                </p>
                <p className="text-slate-600 text-xs mt-2">
                  Try asking about choke points or Ghost Cycles.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
