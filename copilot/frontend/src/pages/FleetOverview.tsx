import { useState, useEffect } from 'react'
import { Truck, Timer, Fuel, TrendingUp, Ghost, AlertTriangle } from 'lucide-react'
import { MetricCard } from '../components/MetricCard'

interface Equipment {
  id: string
  type: 'haul_truck' | 'excavator' | 'loader'
  speed: number
  engineLoad: number
  fuelRate: number
  status: 'working' | 'idle' | 'ghost_cycle' | 'offline'
  cyclesCompleted: number
  volumeToday: number
}

export function FleetOverview() {
  const [equipment, setEquipment] = useState<Equipment[]>([
    { id: 'HT-201', type: 'haul_truck', speed: 15.2, engineLoad: 72, fuelRate: 8.5, status: 'working', cyclesCompleted: 12, volumeToday: 720 },
    { id: 'HT-202', type: 'haul_truck', speed: 0, engineLoad: 5, fuelRate: 1.2, status: 'idle', cyclesCompleted: 8, volumeToday: 480 },
    { id: 'HT-203', type: 'haul_truck', speed: 18.5, engineLoad: 85, fuelRate: 9.2, status: 'working', cyclesCompleted: 14, volumeToday: 840 },
    { id: 'HT-204', type: 'haul_truck', speed: 8.0, engineLoad: 15, fuelRate: 3.5, status: 'ghost_cycle', cyclesCompleted: 6, volumeToday: 360 },
    { id: 'HT-205', type: 'haul_truck', speed: 22.1, engineLoad: 78, fuelRate: 8.8, status: 'working', cyclesCompleted: 11, volumeToday: 660 },
    { id: 'EX-101', type: 'excavator', speed: 0, engineLoad: 88, fuelRate: 12.5, status: 'working', cyclesCompleted: 0, volumeToday: 0 },
    { id: 'EX-102', type: 'excavator', speed: 0, engineLoad: 92, fuelRate: 13.2, status: 'working', cyclesCompleted: 0, volumeToday: 0 },
    { id: 'LD-301', type: 'loader', speed: 3.2, engineLoad: 65, fuelRate: 6.8, status: 'working', cyclesCompleted: 0, volumeToday: 0 },
  ])

  const [summary, setSummary] = useState({
    totalEquipment: 8,
    active: 6,
    ghostCycles: 1,
    totalCycles: 51,
    totalVolume: 3060,
    avgEfficiency: 82,
  })

  // Simulate updates
  useEffect(() => {
    const interval = setInterval(() => {
      setEquipment(prev => prev.map(eq => ({
        ...eq,
        speed: eq.status === 'working' ? Math.max(0, eq.speed + (Math.random() - 0.5) * 2) : eq.speed,
        engineLoad: eq.status === 'working' ? Math.max(50, Math.min(100, eq.engineLoad + (Math.random() - 0.5) * 5)) : eq.engineLoad,
      })))
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'working':
        return <span className="px-2 py-0.5 bg-accent-emerald/20 text-accent-emerald text-xs rounded-full">Working</span>
      case 'idle':
        return <span className="px-2 py-0.5 bg-stone-500/20 text-stone-400 text-xs rounded-full">Idle</span>
      case 'ghost_cycle':
        return <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded-full flex items-center gap-1"><Ghost size={10} /> Ghost</span>
      case 'offline':
        return <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">Offline</span>
      default:
        return null
    }
  }

  const getEquipmentIcon = (type: string) => {
    switch (type) {
      case 'haul_truck': return '🚚'
      case 'excavator': return '🏗️'
      case 'loader': return '🚜'
      default: return '🔧'
    }
  }

  return (
    <div className="h-screen flex flex-col animated-grid-bg">
      {/* Header */}
      <header className="bg-earth-800/80 backdrop-blur border-b border-earth-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-display font-semibold text-stone-200">Fleet Overview</h1>
            <p className="text-sm text-stone-400">Real-time equipment status and performance</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-accent-emerald rounded-full status-online" />
            <span className="text-sm text-stone-400">Live Updates</span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {/* Summary Metrics */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          <MetricCard
            label="Total Equipment"
            value={summary.totalEquipment}
            icon={<Truck size={16} />}
            status="neutral"
          />
          <MetricCard
            label="Active"
            value={summary.active}
            icon={<TrendingUp size={16} />}
            status="good"
          />
          <MetricCard
            label="Ghost Cycles"
            value={summary.ghostCycles}
            icon={<Ghost size={16} />}
            status={summary.ghostCycles > 0 ? 'warning' : 'good'}
          />
          <MetricCard
            label="Cycles Today"
            value={summary.totalCycles}
            icon={<Timer size={16} />}
            trend="up"
            status="good"
          />
          <MetricCard
            label="Volume Moved"
            value={summary.totalVolume.toLocaleString()}
            unit="yd³"
            trend="up"
            status="good"
          />
          <MetricCard
            label="Avg Efficiency"
            value={summary.avgEfficiency}
            unit="%"
            status="good"
          />
        </div>

        {/* Equipment Table */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-earth-700">
            <h2 className="text-lg font-semibold text-stone-200">Equipment Status</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-earth-700/30">
                  <th className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase">Equipment</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase">Speed</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase">Engine Load</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase">Fuel Rate</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase">Cycles</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-earth-700">
                {equipment.map((eq) => (
                  <tr 
                    key={eq.id} 
                    className={`hover:bg-earth-700/30 transition-colors ${eq.status === 'ghost_cycle' ? 'ghost-cycle' : ''}`}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{getEquipmentIcon(eq.type)}</span>
                        <div>
                          <p className="font-mono font-medium text-stone-200">{eq.id}</p>
                          <p className="text-xs text-stone-500 capitalize">{eq.type.replace('_', ' ')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">{getStatusBadge(eq.status)}</td>
                    <td className="px-4 py-4">
                      <span className="font-mono text-stone-300">{eq.speed.toFixed(1)}</span>
                      <span className="text-xs text-stone-500 ml-1">mph</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-earth-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              eq.engineLoad > 70 ? 'bg-accent-emerald' : 
                              eq.engineLoad > 30 ? 'bg-accent-amber' : 'bg-orange-500'
                            }`}
                            style={{ width: `${eq.engineLoad}%` }}
                          />
                        </div>
                        <span className="font-mono text-sm text-stone-300">{eq.engineLoad}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-mono text-stone-300">{eq.fuelRate.toFixed(1)}</span>
                      <span className="text-xs text-stone-500 ml-1">gal/hr</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-mono text-stone-300">{eq.cyclesCompleted}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-mono text-stone-300">{eq.volumeToday}</span>
                      <span className="text-xs text-stone-500 ml-1">yd³</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ghost Cycle Alert */}
        {summary.ghostCycles > 0 && (
          <div className="mt-6 card ghost-cycle p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Ghost size={20} className="text-orange-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-stone-200">Ghost Cycle Detected</h3>
                <p className="text-sm text-stone-400">
                  {summary.ghostCycles} equipment showing movement without productive load. 
                  Estimated fuel waste: ~{(summary.ghostCycles * 1.5).toFixed(1)} gal/hr
                </p>
              </div>
              <button className="px-4 py-2 bg-orange-500/20 border border-orange-500/30 rounded-lg text-orange-400 text-sm hover:bg-orange-500/30 transition-colors">
                View Details
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
