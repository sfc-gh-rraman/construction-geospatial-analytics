import { useState } from 'react'
import { Route, AlertTriangle, Fuel, Clock, DollarSign, MapPin, TrendingUp, Ghost } from 'lucide-react'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
  Area,
  ComposedChart,
  Line,
} from 'recharts'

// Sample cycle time distribution data showing bimodal distribution (bottleneck indicator)
const cycleTimeData = [
  { time: 8, count: 12 },
  { time: 9, count: 18 },
  { time: 10, count: 28 },
  { time: 11, count: 35 },
  { time: 12, count: 22 },
  { time: 13, count: 15 },
  { time: 14, count: 8 },
  { time: 15, count: 12 }, // Second peak starts (choke point effect)
  { time: 16, count: 18 },
  { time: 17, count: 25 },
  { time: 18, count: 32 },
  { time: 19, count: 28 },
  { time: 20, count: 18 },
  { time: 21, count: 10 },
  { time: 22, count: 5 },
]

// Ghost cycle correlation data: GPS speed vs Engine Load
const ghostCycleData = [
  { time: '06:00', gpsSpeed: 15, engineLoad: 75, isGhost: false },
  { time: '06:15', gpsSpeed: 18, engineLoad: 82, isGhost: false },
  { time: '06:30', gpsSpeed: 12, engineLoad: 68, isGhost: false },
  { time: '06:45', gpsSpeed: 8, engineLoad: 25, isGhost: true },  // Ghost cycle starts
  { time: '07:00', gpsSpeed: 5, engineLoad: 20, isGhost: true },
  { time: '07:15', gpsSpeed: 6, engineLoad: 22, isGhost: true },
  { time: '07:30', gpsSpeed: 4, engineLoad: 18, isGhost: true },  // Peak ghost
  { time: '07:45', gpsSpeed: 10, engineLoad: 45, isGhost: false },
  { time: '08:00', gpsSpeed: 16, engineLoad: 78, isGhost: false },
  { time: '08:15', gpsSpeed: 18, engineLoad: 85, isGhost: false },
  { time: '08:30', gpsSpeed: 14, engineLoad: 72, isGhost: false },
  { time: '08:45', gpsSpeed: 7, engineLoad: 28, isGhost: true },  // Another ghost cycle
  { time: '09:00', gpsSpeed: 5, engineLoad: 22, isGhost: true },
  { time: '09:15', gpsSpeed: 12, engineLoad: 65, isGhost: false },
  { time: '09:30', gpsSpeed: 17, engineLoad: 80, isGhost: false },
]

// Choke point data
const chokePoints = [
  { id: 1, name: 'Stockpile B Intersection', waitTime: 12, truckCount: 8, fuelWaste: 340, lat: 33.4520, lng: -112.0845 },
  { id: 2, name: 'North Road Bend', waitTime: 8, truckCount: 5, fuelWaste: 180, lat: 33.4535, lng: -112.0820 },
]

// Route efficiency by segment
const routeSegments = [
  { name: 'Load Zone A', avgSpeed: 8, expected: 8, efficiency: 100 },
  { name: 'Haul Road North', avgSpeed: 22, expected: 25, efficiency: 88 },
  { name: 'Stockpile B Int.', avgSpeed: 4, expected: 15, efficiency: 27 },  // Bottleneck!
  { name: 'Haul Road South', avgSpeed: 24, expected: 25, efficiency: 96 },
  { name: 'Dump Zone C', avgSpeed: 6, expected: 8, efficiency: 75 },
]

export function HaulRoadAnalytics() {
  const [selectedChokePoint, setSelectedChokePoint] = useState<typeof chokePoints[0] | null>(null)
  const [showGhostOverlay, setShowGhostOverlay] = useState(true)

  // Calculate totals
  const totalFuelWaste = chokePoints.reduce((sum, cp) => sum + cp.fuelWaste, 0)
  const ghostCycleCount = ghostCycleData.filter(d => d.isGhost).length
  const ghostCyclePercent = ((ghostCycleCount / ghostCycleData.length) * 100).toFixed(0)

  return (
    <div className="p-6 animated-grid-bg min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-200 flex items-center gap-3">
          <Route className="text-amber-400" />
          Haul Road Analytics
        </h1>
        <p className="text-slate-400">Project Alpha • Ghost Cycle & Choke Point Detection</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card card-glow border-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Ghost size={24} className="text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Ghost Cycles Today</p>
              <p className="text-2xl font-mono font-bold text-purple-400">{ghostCyclePercent}%</p>
              <p className="text-xs text-slate-500">of operating time</p>
            </div>
          </div>
        </div>
        <div className="card card-glow border-orange-500/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <AlertTriangle size={24} className="text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Active Choke Points</p>
              <p className="text-2xl font-mono font-bold text-orange-400">{chokePoints.length}</p>
              <p className="text-xs text-slate-500">bottlenecks detected</p>
            </div>
          </div>
        </div>
        <div className="card card-glow border-red-500/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
              <Fuel size={24} className="text-red-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Fuel Wasted Today</p>
              <p className="text-2xl font-mono font-bold text-red-400">${totalFuelWaste}</p>
              <p className="text-xs text-slate-500">from idle time</p>
            </div>
          </div>
        </div>
        <div className="card card-glow border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Clock size={24} className="text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Avg Wait Time</p>
              <p className="text-2xl font-mono font-bold text-amber-400">
                {(chokePoints.reduce((sum, cp) => sum + cp.waitTime, 0) / chokePoints.length).toFixed(0)} min
              </p>
              <p className="text-xs text-slate-500">at choke points</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Ghost Cycle Detection Chart - THE KEY DISCOVERY */}
        <div className="col-span-8">
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-slate-200 flex items-center gap-2">
                  <Ghost size={20} className="text-purple-400" />
                  Ghost Cycle Detection
                </h3>
                <p className="text-sm text-slate-400">GPS Speed vs Engine Load correlation reveals hidden inefficiencies</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={showGhostOverlay}
                  onChange={(e) => setShowGhostOverlay(e.target.checked)}
                  className="w-4 h-4 accent-purple-500"
                />
                <span className="text-sm text-slate-400">Highlight Ghost Cycles</span>
              </label>
            </div>

            {/* Explanation Banner */}
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <Ghost size={20} className="text-purple-400 mt-0.5" />
                <div>
                  <p className="text-sm text-purple-300 font-medium">What is a Ghost Cycle?</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Equipment appears "active" (GPS shows movement) but engine load is at idle levels (20-30%). 
                    This indicates trucks are coasting, waiting in traffic, or moving without payload - 
                    <span className="text-purple-400 font-semibold"> burning fuel without productive work</span>.
                  </p>
                </div>
              </div>
            </div>

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={ghostCycleData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="time" stroke="#94a3b8" />
                  <YAxis yAxisId="left" stroke="#94a3b8" label={{ value: 'Speed (mph)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" label={{ value: 'Engine Load %', angle: 90, position: 'insideRight', fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                  />
                  
                  {/* Ghost cycle highlight areas */}
                  {showGhostOverlay && (
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey={(d: any) => d.isGhost ? 25 : 0}
                      fill="#a855f7"
                      fillOpacity={0.2}
                      stroke="none"
                    />
                  )}
                  
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="gpsSpeed"
                    stroke="#06b6d4"
                    strokeWidth={3}
                    name="GPS Speed"
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="engineLoad"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    name="Engine Load"
                    dot={false}
                  />
                  
                  {/* Reference line for idle threshold */}
                  <ReferenceLine yAxisId="right" y={30} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Idle Threshold', fill: '#ef4444', fontSize: 10 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-cyan-400" />
                <span className="text-slate-400">GPS Speed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-amber-400" />
                <span className="text-slate-400">Engine Load</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500/30 rounded" />
                <span className="text-slate-400">Ghost Cycle Zone</span>
              </div>
            </div>
          </div>

          {/* Cycle Time Distribution */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-slate-200">Cycle Time Distribution</h3>
                <p className="text-sm text-slate-400">Bimodal distribution indicates traffic bottleneck</p>
              </div>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cycleTimeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#94a3b8"
                    label={{ value: 'Cycle Time (minutes)', position: 'bottom', fill: '#94a3b8' }}
                  />
                  <YAxis stroke="#94a3b8" label={{ value: 'Truck Count', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" name="Trucks">
                    {cycleTimeData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.time >= 15 && entry.time <= 19 ? '#f97316' : '#3b82f6'}
                      />
                    ))}
                  </Bar>
                  {/* Annotation for second peak */}
                  <ReferenceLine x={17} stroke="#f97316" strokeDasharray="5 5" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <p className="text-sm text-orange-400 flex items-center gap-2">
                <AlertTriangle size={16} />
                <span className="font-medium">Bimodal Pattern Detected:</span>
              </p>
              <p className="text-xs text-slate-400 mt-1 ml-6">
                Second peak at 17-18 minutes suggests ~35% of trucks are experiencing delays. 
                This adds 6-7 minutes per cycle, costing approximately <span className="text-red-400 font-semibold">$2,340/day in fuel</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="col-span-4 space-y-6">
          {/* Choke Points */}
          <div className="card">
            <h3 className="text-lg font-medium text-slate-200 mb-4 flex items-center gap-2">
              <MapPin size={18} className="text-orange-400" />
              Active Choke Points
            </h3>
            <div className="space-y-3">
              {chokePoints.map((cp) => (
                <button
                  key={cp.id}
                  onClick={() => setSelectedChokePoint(cp)}
                  className={`w-full p-4 rounded-lg border transition-all text-left
                    ${selectedChokePoint?.id === cp.id 
                      ? 'bg-orange-500/10 border-orange-500/30' 
                      : 'bg-navy-700/50 border-navy-600 hover:border-orange-500/20'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-200">{cp.name}</span>
                    <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded-full">
                      {cp.waitTime} min avg
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500">Trucks waiting:</span>
                      <span className="ml-1 text-cyan-400 font-mono">{cp.truckCount}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Fuel waste:</span>
                      <span className="ml-1 text-red-400 font-mono">${cp.fuelWaste}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {selectedChokePoint && (
              <div className="mt-4 p-4 bg-accent-green/10 border border-accent-green/20 rounded-lg">
                <p className="text-sm text-accent-green font-medium mb-2">💡 AI Recommendation</p>
                <p className="text-xs text-slate-400">
                  Relocate Stockpile B approximately <span className="text-accent-green font-semibold">50 meters east</span> to 
                  eliminate intersection conflict. Estimated savings: <span className="text-accent-green font-semibold">$1,200/day</span>.
                </p>
              </div>
            )}
          </div>

          {/* Route Efficiency */}
          <div className="card">
            <h3 className="text-lg font-medium text-slate-200 mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-cyan-400" />
              Route Segment Efficiency
            </h3>
            <div className="space-y-3">
              {routeSegments.map((segment, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-300">{segment.name}</span>
                    <span className={`text-sm font-mono ${
                      segment.efficiency >= 90 ? 'text-accent-green' :
                      segment.efficiency >= 70 ? 'text-accent-amber' : 'text-accent-red'
                    }`}>
                      {segment.efficiency}%
                    </span>
                  </div>
                  <div className="h-2 bg-navy-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        segment.efficiency >= 90 ? 'bg-accent-green' :
                        segment.efficiency >= 70 ? 'bg-accent-amber' : 'bg-accent-red'
                      }`}
                      style={{ width: `${segment.efficiency}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>Actual: {segment.avgSpeed} mph</span>
                    <span>Expected: {segment.expected} mph</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Impact Summary */}
          <div className="card bg-gradient-to-br from-purple-500/10 to-red-500/10 border-purple-500/20">
            <h3 className="text-lg font-medium text-slate-200 mb-4 flex items-center gap-2">
              <DollarSign size={18} className="text-red-400" />
              Daily Impact Summary
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Ghost Cycle Fuel Waste</span>
                <span className="text-red-400 font-mono font-bold">$1,840</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Choke Point Delays</span>
                <span className="text-red-400 font-mono font-bold">$520</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Lost Productivity</span>
                <span className="text-red-400 font-mono font-bold">$980</span>
              </div>
              <hr className="border-navy-600" />
              <div className="flex justify-between items-center">
                <span className="text-slate-200 font-medium">Total Daily Loss</span>
                <span className="text-red-400 font-mono font-bold text-xl">$3,340</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Monthly projection: <span className="text-red-400 font-semibold">$66,800</span> in preventable losses
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
