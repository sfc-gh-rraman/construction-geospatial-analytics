import { useState, useEffect } from 'react'
import { 
  Truck, 
  Fuel, 
  Timer, 
  AlertTriangle, 
  Ghost,
  TrafficCone,
  Brain,
  Database,
  Shield,
  Zap
} from 'lucide-react'
import { Chat } from '../components/Chat'
import { AlertCard } from '../components/AlertCard'
import { MetricCard } from '../components/MetricCard'

interface Alert {
  id: string
  type: 'ghost_cycle' | 'choke_point' | 'warning' | 'danger' | 'info'
  title: string
  message: string
  recommendation?: string
  equipment_id?: string
  zone_name?: string
  fuel_waste?: number
  timestamp: Date
}

interface AgentStatus {
  name: string
  icon: any
  status: 'idle' | 'active' | 'processing'
  lastAction?: string
}

export function CommandCenter() {
  const [metrics, setMetrics] = useState({
    activeEquipment: 12,
    cyclesCompleted: 47,
    volumeMoved: 2840,
    avgCycleTime: 22.5,
    fuelWaste: 3.2,
    chokePoints: 1,
  })

  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      type: 'ghost_cycle',
      title: 'Ghost Cycle Detected',
      message: 'HT-204 moving at 8 mph with only 15% engine load for 12 minutes',
      recommendation: 'Verify equipment is assigned productive work',
      equipment_id: 'HT-204',
      fuel_waste: 1.2,
      timestamp: new Date(),
    },
    {
      id: '2',
      type: 'choke_point',
      title: 'Choke Point Forming',
      message: 'Zone B3 showing 5 trucks with avg speed 3 mph',
      recommendation: 'Divert incoming trucks to alternate route via Zone C1',
      zone_name: 'Zone B3',
      timestamp: new Date(Date.now() - 5 * 60000),
    },
  ])

  const [context, setContext] = useState<any>(null)
  
  const [agents] = useState<AgentStatus[]>([
    { name: 'Orchestrator', icon: Brain, status: 'idle', lastAction: 'Ready' },
    { name: 'Watchdog', icon: Shield, status: 'active', lastAction: 'Monitoring telemetry...' },
    { name: 'RouteAdvisor', icon: TrafficCone, status: 'idle', lastAction: '3 routes optimized' },
    { name: 'Historian', icon: Database, status: 'idle', lastAction: '10K cycles indexed' },
  ])

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        cyclesCompleted: prev.cyclesCompleted + (Math.random() > 0.7 ? 1 : 0),
        volumeMoved: prev.volumeMoved + (Math.random() > 0.5 ? Math.floor(Math.random() * 30) : 0),
        avgCycleTime: Math.max(18, Math.min(28, prev.avgCycleTime + (Math.random() - 0.5) * 0.5)),
        fuelWaste: Math.max(0, Math.min(8, prev.fuelWaste + (Math.random() - 0.5) * 0.3)),
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
      case 'active': return 'bg-accent-emerald'
      case 'processing': return 'bg-accent-cyan animate-pulse'
      default: return 'bg-stone-500'
    }
  }

  return (
    <div className="h-screen flex flex-col animated-grid-bg">
      {/* Header */}
      <header className="bg-earth-800/80 backdrop-blur border-b border-earth-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-display font-semibold text-stone-200">Command Center</h1>
            <p className="text-sm text-stone-400">Site ALPHA • Highway 101 Expansion</p>
          </div>
          <div className="flex items-center gap-6">
            {/* Agent Status Indicators */}
            <div className="flex items-center gap-3">
              {agents.map((agent, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-earth-700/50 border border-earth-600"
                  title={`${agent.name}: ${agent.lastAction}`}
                >
                  <agent.icon size={14} className={agent.status === 'active' ? 'text-accent-emerald' : 'text-stone-400'} />
                  <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(agent.status)}`} />
                </div>
              ))}
            </div>
            
            <div className="h-8 w-px bg-earth-700" />
            
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-accent-emerald rounded-full status-online" />
              <span className="text-sm text-stone-400">Live</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Metrics & Alerts */}
        <div className="w-80 border-r border-earth-700/50 flex flex-col overflow-hidden bg-earth-800/30">
          {/* Key Metrics */}
          <div className="p-4 border-b border-earth-700/50">
            <h3 className="text-sm font-medium text-stone-300 mb-3 flex items-center gap-2">
              <Zap size={16} className="text-accent-amber" />
              Live Metrics
              <div className="ml-auto flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-accent-amber rounded-full animate-pulse" />
                <span className="text-xs text-accent-amber">STREAMING</span>
              </div>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="Active Equipment"
                value={metrics.activeEquipment}
                icon={<Truck size={14} />}
                status="good"
                size="sm"
              />
              <MetricCard
                label="Cycles Today"
                value={metrics.cyclesCompleted}
                icon={<Timer size={14} />}
                trend="up"
                status="good"
                size="sm"
              />
              <MetricCard
                label="Volume Moved"
                value={metrics.volumeMoved.toLocaleString()}
                unit="yd³"
                trend="up"
                status="good"
                size="sm"
              />
              <MetricCard
                label="Avg Cycle"
                value={metrics.avgCycleTime.toFixed(1)}
                unit="min"
                status="neutral"
                size="sm"
              />
            </div>
          </div>

          {/* Ghost Cycle & Choke Point Summary */}
          <div className="p-4 border-b border-earth-700/50">
            <div className="grid grid-cols-2 gap-3">
              <div className="card p-3 ghost-cycle">
                <div className="flex items-center gap-2 mb-1">
                  <Ghost size={16} className="text-orange-400" />
                  <span className="text-xs text-stone-400">Ghost Cycles</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-mono font-semibold text-orange-400">
                    {alerts.filter(a => a.type === 'ghost_cycle').length}
                  </span>
                  <span className="text-xs text-stone-500">detected</span>
                </div>
                <div className="text-xs text-orange-400/70 mt-1">
                  ~{metrics.fuelWaste.toFixed(1)} gal/hr waste
                </div>
              </div>
              
              <div className="card p-3 choke-point">
                <div className="flex items-center gap-2 mb-1">
                  <TrafficCone size={16} className="text-red-400" />
                  <span className="text-xs text-stone-400">Choke Points</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-mono font-semibold text-red-400">
                    {metrics.chokePoints}
                  </span>
                  <span className="text-xs text-stone-500">active</span>
                </div>
                <div className="text-xs text-red-400/70 mt-1">
                  ~15 min delays
                </div>
              </div>
            </div>
          </div>

          {/* Active Alerts */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <h3 className="text-sm font-medium text-stone-300 mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-safety-yellow" />
              Active Alerts
              {alerts.length > 0 && (
                <span className="ml-auto px-2 py-0.5 bg-safety-yellow/20 text-safety-yellow text-xs rounded-full">
                  {alerts.length}
                </span>
              )}
            </h3>
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-accent-emerald/10 flex items-center justify-center mx-auto mb-3">
                    <Shield size={24} className="text-accent-emerald" />
                  </div>
                  <p className="text-sm text-stone-400">All systems nominal</p>
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
        </div>

        {/* Center - Chat */}
        <div className="flex-1 flex flex-col">
          <Chat onContextUpdate={handleContextUpdate} />
        </div>

        {/* Right Panel - Context */}
        <div className="w-80 border-l border-earth-700/50 overflow-y-auto bg-earth-800/30 custom-scrollbar">
          <div className="p-4 border-b border-earth-700/50">
            <h3 className="text-sm font-medium text-stone-300 flex items-center gap-2">
              Context Panel
              <span className="ml-auto text-xs text-stone-500">Powered by Cortex</span>
            </h3>
          </div>
          
          <div className="p-4">
            {context && Object.keys(context).length > 0 ? (
              <div className="space-y-4 animate-slide-up">
                {context.ghost_cycles && (
                  <div className="card card-glow p-4">
                    <h4 className="text-xs text-orange-400 font-medium mb-2 flex items-center gap-2">
                      <Ghost size={12} />
                      Ghost Cycle Analysis
                    </h4>
                    <div className="text-sm text-stone-300">
                      {context.ghost_cycles.length} equipment flagged
                    </div>
                  </div>
                )}
                
                {context.route_recommendations && (
                  <div className="card card-glow p-4">
                    <h4 className="text-xs text-cyan-400 font-medium mb-2 flex items-center gap-2">
                      <TrafficCone size={12} />
                      Route Recommendations
                    </h4>
                    <div className="space-y-2">
                      {context.route_recommendations.recommendations?.slice(0, 3).map((rec: any, i: number) => (
                        <div key={i} className="text-xs p-2 bg-earth-700/50 rounded">
                          <div className="font-medium text-stone-300">{rec.message}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-earth-700/50 flex items-center justify-center mx-auto mb-4 relative">
                  <Brain size={28} className="text-stone-600" />
                  <div className="absolute inset-0 rounded-2xl border border-earth-600 animate-pulse" />
                </div>
                <p className="text-stone-400 text-sm">
                  Insights and data will appear here based on your conversation.
                </p>
                <p className="text-stone-600 text-xs mt-2">
                  Ask about Ghost Cycles, choke points, or cycle times.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
