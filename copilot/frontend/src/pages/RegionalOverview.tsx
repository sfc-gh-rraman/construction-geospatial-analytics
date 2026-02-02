import { useState, useEffect } from 'react'
import { Map, Layers, TrendingUp, DollarSign, Truck, AlertTriangle, ChevronDown } from 'lucide-react'

// Site data with real Arizona coordinates
const SITES = [
  { id: 'alpha', name: 'Project Alpha', lat: 33.4512, lng: -112.0832, type: 'Highway Construction', status: 'on_track', variance: 2.1, equipment: 48, volume: 420000 },
  { id: 'beta', name: 'Project Beta', lat: 33.4287, lng: -112.1145, type: 'Solar Farm Prep', status: 'at_risk', variance: -0.5, equipment: 32, volume: 280000 },
  { id: 'gamma', name: 'Project Gamma', lat: 33.4701, lng: -112.0623, type: 'Commercial Pad', status: 'behind', variance: -8.2, equipment: 24, volume: 156000 },
  { id: 'delta', name: 'Project Delta', lat: 33.4089, lng: -112.0901, type: 'Reservoir Excavation', status: 'on_track', variance: 4.7, equipment: 28, volume: 340000 },
  { id: 'echo', name: 'Project Echo', lat: 33.4398, lng: -112.1288, type: 'Residential Mass Grading', status: 'on_track', variance: 1.2, equipment: 20, volume: 195000 },
]

interface Site {
  id: string
  name: string
  lat: number
  lng: number
  type: string
  status: 'on_track' | 'at_risk' | 'behind'
  variance: number
  equipment: number
  volume: number
}

export function RegionalOverview() {
  const [sites] = useState<Site[]>(SITES)
  const [selectedSite, setSelectedSite] = useState<Site | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track': return { bg: 'bg-accent-green', text: 'text-accent-green', border: 'border-accent-green' }
      case 'at_risk': return { bg: 'bg-accent-amber', text: 'text-accent-amber', border: 'border-accent-amber' }
      case 'behind': return { bg: 'bg-accent-red', text: 'text-accent-red', border: 'border-accent-red' }
      default: return { bg: 'bg-slate-500', text: 'text-slate-500', border: 'border-slate-500' }
    }
  }

  // Calculate fleet KPIs
  const fleetKPIs = {
    totalSites: sites.length,
    totalEquipment: sites.reduce((sum, s) => sum + s.equipment, 0),
    totalVolume: sites.reduce((sum, s) => sum + s.volume, 0),
    avgCostPerYard: 4.20,
    fleetUtilization: 87,
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading regional data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 animated-grid-bg min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-200 flex items-center gap-3">
          <Map className="text-amber-400" />
          Regional Overview
        </h1>
        <p className="text-slate-400">Arizona Construction Corridor • {sites.length} Active Sites</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="card card-glow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Layers size={20} className="text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Active Sites</p>
              <p className="text-2xl font-semibold text-amber-400 metric-glow">{fleetKPIs.totalSites}</p>
            </div>
          </div>
        </div>
        <div className="card card-glow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <Truck size={20} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Equipment Units</p>
              <p className="text-2xl font-semibold text-cyan-400 metric-glow">{fleetKPIs.totalEquipment}</p>
            </div>
          </div>
        </div>
        <div className="card card-glow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <TrendingUp size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Volume Moved</p>
              <p className="text-2xl font-semibold text-emerald-400 metric-glow">
                {(fleetKPIs.totalVolume / 1000000).toFixed(1)}M yd³
              </p>
            </div>
          </div>
        </div>
        <div className="card card-glow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <DollarSign size={20} className="text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Cost per Yard</p>
              <p className="text-2xl font-semibold text-purple-400 metric-glow">${fleetKPIs.avgCostPerYard}</p>
            </div>
          </div>
        </div>
        <div className="card card-glow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <TrendingUp size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Fleet Utilization</p>
              <p className="text-2xl font-semibold text-blue-400 metric-glow">{fleetKPIs.fleetUtilization}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Map Area */}
        <div className="col-span-8">
          <div className="card h-[500px] relative overflow-hidden">
            <div className="absolute top-4 left-4 z-10">
              <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Map size={16} className="text-amber-400" />
                Site Locations
              </h3>
            </div>
            
            {/* Placeholder map with site markers */}
            <div className="w-full h-full bg-navy-700/50 rounded-lg relative">
              {/* Stylized map background */}
              <div className="absolute inset-0 opacity-30">
                <svg viewBox="0 0 800 500" className="w-full h-full">
                  {/* Grid lines */}
                  {[...Array(10)].map((_, i) => (
                    <line key={`h-${i}`} x1="0" y1={i * 50} x2="800" y2={i * 50} stroke="#334155" strokeWidth="1" />
                  ))}
                  {[...Array(16)].map((_, i) => (
                    <line key={`v-${i}`} x1={i * 50} y1="0" x2={i * 50} y2="500" stroke="#334155" strokeWidth="1" />
                  ))}
                </svg>
              </div>

              {/* Site markers */}
              {sites.map((site, i) => {
                const colors = getStatusColor(site.status)
                // Map lat/lng to relative positions (simplified for demo)
                const x = 100 + (i * 120)
                const y = 150 + (i % 2) * 100
                
                return (
                  <button
                    key={site.id}
                    onClick={() => setSelectedSite(site)}
                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all hover:scale-110
                      ${selectedSite?.id === site.id ? 'z-20' : 'z-10'}`}
                    style={{ left: `${x}px`, top: `${y}px` }}
                  >
                    {/* Pulse ring for selected */}
                    {selectedSite?.id === site.id && (
                      <div className={`absolute inset-0 rounded-full ${colors.bg} animate-ping opacity-50`} 
                           style={{ width: '60px', height: '60px', marginLeft: '-15px', marginTop: '-15px' }} />
                    )}
                    
                    {/* Marker */}
                    <div className={`w-8 h-8 rounded-full ${colors.bg}/30 border-2 ${colors.border} flex items-center justify-center
                      ${selectedSite?.id === site.id ? 'ring-4 ring-white/20' : ''}`}>
                      <div className={`w-3 h-3 rounded-full ${colors.bg}`} />
                    </div>
                    
                    {/* Label */}
                    <div className="absolute top-10 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <span className="text-xs font-medium text-slate-300 bg-navy-800/90 px-2 py-1 rounded">
                        {site.name}
                      </span>
                    </div>
                  </button>
                )
              })}

              {/* Map legend */}
              <div className="absolute bottom-4 left-4 bg-navy-800/90 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-2">Status</div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-accent-green" />
                    <span className="text-xs text-slate-300">On Track</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-accent-amber" />
                    <span className="text-xs text-slate-300">At Risk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-accent-red" />
                    <span className="text-xs text-slate-300">Behind</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Site Details Panel */}
        <div className="col-span-4 space-y-4">
          {/* Selected Site Details */}
          {selectedSite ? (
            <div className="card animate-slide-up">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-200">{selectedSite.name}</h3>
                  <p className="text-sm text-slate-400">{selectedSite.type}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedSite.status).bg}/20 ${getStatusColor(selectedSite.status).text}`}>
                  {selectedSite.status.replace('_', ' ')}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-navy-700/50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Schedule Variance</p>
                  <p className={`text-xl font-mono font-bold ${selectedSite.variance >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                    {selectedSite.variance >= 0 ? '+' : ''}{selectedSite.variance}%
                  </p>
                </div>
                <div className="bg-navy-700/50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Equipment</p>
                  <p className="text-xl font-mono font-bold text-cyan-400">{selectedSite.equipment}</p>
                </div>
                <div className="bg-navy-700/50 rounded-lg p-3 col-span-2">
                  <p className="text-xs text-slate-500">Volume Moved</p>
                  <p className="text-xl font-mono font-bold text-amber-400">
                    {selectedSite.volume.toLocaleString()} yd³
                  </p>
                </div>
              </div>

              <div className="text-xs text-slate-500 mb-2">Coordinates</div>
              <p className="font-mono text-sm text-slate-400">
                {selectedSite.lat.toFixed(4)}°N, {Math.abs(selectedSite.lng).toFixed(4)}°W
              </p>

              <button className="w-full mt-4 btn-primary">
                View Site Command
              </button>
            </div>
          ) : (
            <div className="card text-center py-12">
              <Map size={48} className="mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400">Select a site on the map to view details</p>
            </div>
          )}

          {/* Site Performance List */}
          <div className="card">
            <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-amber-400" />
              Site Performance
            </h3>
            <div className="space-y-2">
              {sites
                .sort((a, b) => b.variance - a.variance)
                .map((site) => {
                  const colors = getStatusColor(site.status)
                  return (
                    <button
                      key={site.id}
                      onClick={() => setSelectedSite(site)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg hover:bg-navy-700/50 transition-colors
                        ${selectedSite?.id === site.id ? 'bg-navy-700/50 ring-1 ring-amber-500/30' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${colors.bg}`} />
                        <span className="text-sm text-slate-200">{site.name}</span>
                      </div>
                      <span className={`font-mono text-sm ${site.variance >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                        {site.variance >= 0 ? '+' : ''}{site.variance}%
                      </span>
                    </button>
                  )
                })}
            </div>
          </div>

          {/* Alerts Summary */}
          <div className="card">
            <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-400" />
              Regional Alerts
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-accent-amber/10 rounded-lg border border-accent-amber/20">
                <span className="text-sm text-slate-300">Ghost Cycles Detected</span>
                <span className="text-lg font-mono font-bold text-accent-amber">3</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-accent-orange/10 rounded-lg border border-accent-orange/20">
                <span className="text-sm text-slate-300">Choke Points Active</span>
                <span className="text-lg font-mono font-bold text-accent-orange">2</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-accent-red/10 rounded-lg border border-accent-red/20">
                <span className="text-sm text-slate-300">Sites Behind Schedule</span>
                <span className="text-lg font-mono font-bold text-accent-red">1</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
