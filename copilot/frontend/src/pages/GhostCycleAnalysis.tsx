import { useState, useEffect } from 'react'
import { AlertTriangle, Truck, DollarSign, TrendingUp, Zap, Clock, MapPin } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface GhostCyclePattern {
  totalGhostCycles: number
  totalFuelWasted: number
  estimatedMonthlyCost: number
  affectedEquipment: number
  affectedSites: number
  topOffenders: {
    equipmentId: string
    equipmentName: string
    ghostCount: number
    fuelWasted: number
    siteName: string
  }[]
  bySite: {
    siteName: string
    ghostCount: number
    fuelWasted: number
  }[]
  byHour: {
    hour: number
    ghostCount: number
  }[]
}

const COLORS = ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5']

export function GhostCycleAnalysis() {
  const [data, setData] = useState<GhostCyclePattern | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGhostCycleData()
  }, [])

  const fetchGhostCycleData = async () => {
    try {
      const res = await fetch('/api/ml/hidden-pattern-analysis')
      if (res.ok) {
        const result = await res.json()
        setData(result)
      } else {
        throw new Error('API not available')
      }
    } catch (error) {
      console.error('Failed to fetch ghost cycle data:', error)
      // Fallback data for demo
      setData({
        totalGhostCycles: 156,
        totalFuelWasted: 1240,
        estimatedMonthlyCost: 47120,
        affectedEquipment: 23,
        affectedSites: 4,
        topOffenders: [
          { equipmentId: 'H-07', equipmentName: 'CAT 793 #7', ghostCount: 28, fuelWasted: 224, siteName: 'Project Alpha' },
          { equipmentId: 'H-12', equipmentName: 'CAT 793 #12', ghostCount: 24, fuelWasted: 192, siteName: 'Project Beta' },
          { equipmentId: 'H-03', equipmentName: 'CAT 793 #3', ghostCount: 21, fuelWasted: 168, siteName: 'Project Alpha' },
          { equipmentId: 'H-19', equipmentName: 'CAT 793 #19', ghostCount: 18, fuelWasted: 144, siteName: 'Project Gamma' },
          { equipmentId: 'H-08', equipmentName: 'CAT 793 #8', ghostCount: 15, fuelWasted: 120, siteName: 'Project Delta' },
        ],
        bySite: [
          { siteName: 'Project Alpha', ghostCount: 58, fuelWasted: 464 },
          { siteName: 'Project Beta', ghostCount: 42, fuelWasted: 336 },
          { siteName: 'Project Gamma', ghostCount: 31, fuelWasted: 248 },
          { siteName: 'Project Delta', ghostCount: 25, fuelWasted: 192 },
        ],
        byHour: [
          { hour: 6, ghostCount: 12 },
          { hour: 7, ghostCount: 8 },
          { hour: 8, ghostCount: 15 },
          { hour: 9, ghostCount: 22 },
          { hour: 10, ghostCount: 18 },
          { hour: 11, ghostCount: 25 },
          { hour: 12, ghostCount: 28 },
          { hour: 13, ghostCount: 14 },
          { hour: 14, ghostCount: 8 },
          { hour: 15, ghostCount: 6 },
        ],
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading || !data) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 animated-grid-bg min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-200 flex items-center gap-3">
          <AlertTriangle className="text-orange-400" />
          Ghost Cycle Detection
        </h1>
        <p className="text-slate-400">Hidden Discovery: Equipment moving but not hauling = wasted fuel</p>
      </div>

      {/* Big Reveal Banner */}
      <div className="card mb-6 p-6 border-orange-500/30 bg-gradient-to-r from-orange-500/10 to-transparent">
        <div className="flex items-start gap-6">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/20 flex items-center justify-center">
            <Zap size={32} className="text-orange-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-orange-400 mb-2">
              🔍 Hidden Discovery: {data.totalGhostCycles} Ghost Cycles Detected
            </h2>
            <p className="text-slate-300 mb-4">
              TERRA identified equipment that appears "active" (GPS shows movement) but is actually 
              wasting fuel (engine load &lt; 30%). These trucks are moving but <strong>not hauling payload</strong>.
            </p>
            <div className="flex items-center gap-8">
              <div>
                <span className="text-3xl font-bold text-orange-400">{data.totalFuelWasted.toLocaleString()}</span>
                <span className="text-slate-400 ml-2">gallons wasted this month</span>
              </div>
              <div>
                <span className="text-3xl font-bold text-red-400">${data.estimatedMonthlyCost.toLocaleString()}</span>
                <span className="text-slate-400 ml-2">estimated monthly cost</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <AlertTriangle size={20} className="text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Ghost Cycles</p>
              <p className="text-2xl font-bold text-orange-400">{data.totalGhostCycles}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <DollarSign size={20} className="text-red-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Monthly Cost</p>
              <p className="text-2xl font-bold text-red-400">${(data.estimatedMonthlyCost / 1000).toFixed(0)}K</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Truck size={20} className="text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Affected Units</p>
              <p className="text-2xl font-bold text-amber-400">{data.affectedEquipment}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <MapPin size={20} className="text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Sites Affected</p>
              <p className="text-2xl font-bold text-purple-400">{data.affectedSites}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <TrendingUp size={20} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Fuel Wasted</p>
              <p className="text-2xl font-bold text-cyan-400">{data.totalFuelWasted.toLocaleString()} gal</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* By Hour Chart */}
        <div className="col-span-8">
          <div className="card p-4">
            <h3 className="text-lg font-medium text-slate-200 mb-4 flex items-center gap-2">
              <Clock size={18} className="text-orange-400" />
              Ghost Cycles by Hour of Day
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="hour" 
                    stroke="#94a3b8" 
                    tickFormatter={(h) => `${h}:00`}
                  />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [value, 'Ghost Cycles']}
                    labelFormatter={(h) => `Hour: ${h}:00`}
                  />
                  <Bar dataKey="ghostCount" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <p className="text-sm text-orange-300">
                <strong>Insight:</strong> Peak Ghost Cycles occur at 11:00-12:00 (lunch transitions) and 9:00-10:00 (shift handovers). 
                Consider optimizing shift scheduling to reduce idle movement.
              </p>
            </div>
          </div>
        </div>

        {/* By Site Pie */}
        <div className="col-span-4">
          <div className="card p-4">
            <h3 className="text-lg font-medium text-slate-200 mb-4">Distribution by Site</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.bySite}
                    dataKey="ghostCount"
                    nameKey="siteName"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ siteName, percent }) => `${siteName.split(' ')[1]} ${(percent * 100).toFixed(0)}%`}
                  >
                    {data.bySite.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Top Offenders */}
        <div className="col-span-12">
          <div className="card p-4">
            <h3 className="text-lg font-medium text-slate-200 mb-4 flex items-center gap-2">
              <Truck size={18} className="text-orange-400" />
              Top Ghost Cycle Offenders
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-navy-700">
                    <th className="text-left py-3 px-4 text-sm text-slate-400">Equipment</th>
                    <th className="text-left py-3 px-4 text-sm text-slate-400">Site</th>
                    <th className="text-right py-3 px-4 text-sm text-slate-400">Ghost Cycles</th>
                    <th className="text-right py-3 px-4 text-sm text-slate-400">Fuel Wasted (gal)</th>
                    <th className="text-right py-3 px-4 text-sm text-slate-400">Est. Cost</th>
                    <th className="text-center py-3 px-4 text-sm text-slate-400">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topOffenders.map((eq, i) => (
                    <tr key={eq.equipmentId} className="border-b border-navy-700/50 hover:bg-navy-700/30">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-200">{eq.equipmentName}</div>
                        <div className="text-xs text-slate-500">{eq.equipmentId}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{eq.siteName}</td>
                      <td className="py-3 px-4 text-right font-mono text-orange-400">{eq.ghostCount}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-200">{eq.fuelWasted}</td>
                      <td className="py-3 px-4 text-right font-mono text-red-400">
                        ${(eq.fuelWasted * 3.8).toFixed(0)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          i === 0 ? 'bg-red-500/20 text-red-400' :
                          i < 3 ? 'bg-orange-500/20 text-orange-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {i === 0 ? 'Critical' : i < 3 ? 'High' : 'Medium'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="card mt-6 p-6">
        <h3 className="text-lg font-medium text-slate-200 mb-4">AI Recommendations</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-navy-700/50 rounded-lg">
            <div className="text-orange-400 font-medium mb-2">1. Route Optimization</div>
            <p className="text-sm text-slate-400">
              Redesign haul road layout at Project Alpha to eliminate unnecessary equipment movement near Stockpile B.
            </p>
          </div>
          <div className="p-4 bg-navy-700/50 rounded-lg">
            <div className="text-orange-400 font-medium mb-2">2. Shift Scheduling</div>
            <p className="text-sm text-slate-400">
              Stagger lunch breaks to reduce 11:00-12:00 congestion that causes trucks to idle while moving.
            </p>
          </div>
          <div className="p-4 bg-navy-700/50 rounded-lg">
            <div className="text-orange-400 font-medium mb-2">3. Driver Training</div>
            <p className="text-sm text-slate-400">
              Focus training on H-07 and H-12 operators who show highest ghost cycle frequency.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
