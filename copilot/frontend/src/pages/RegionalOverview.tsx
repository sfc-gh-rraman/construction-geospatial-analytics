import { useState, useEffect, useRef } from 'react'
import { Map, Layers, TrendingUp, DollarSign, Truck, AlertTriangle, ExternalLink } from 'lucide-react'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// Site data with real Arizona coordinates
const SITES: Site[] = [
  { id: 'alpha', name: 'Project Alpha', lat: 33.4512, lng: -112.0832, type: 'Highway Construction', status: 'on_track', variance: 2.1, equipment: 48, volume: 420000 },
  { id: 'beta', name: 'Project Beta', lat: 33.4287, lng: -112.1145, type: 'Solar Farm Prep', status: 'at_risk', variance: -0.5, equipment: 32, volume: 280000 },
  { id: 'gamma', name: 'Project Gamma', lat: 33.4701, lng: -112.0623, type: 'Commercial Pad', status: 'behind', variance: -8.2, equipment: 24, volume: 156000 },
  { id: 'delta', name: 'Project Delta', lat: 33.4089, lng: -112.0901, type: 'Reservoir Excavation', status: 'on_track', variance: 4.7, equipment: 28, volume: 340000 },
  { id: 'echo', name: 'Project Echo', lat: 33.4398, lng: -112.1288, type: 'Residential Mass Grading', status: 'on_track', variance: 1.2, equipment: 20, volume: 195000 },
]

// Map center (Phoenix area)
const MAP_CENTER: [number, number] = [33.44, -112.08]
const MAP_ZOOM = 12

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

// Custom marker icons
const createMarkerIcon = (status: string) => {
  const colors: Record<string, string> = {
    on_track: '#22c55e',
    at_risk: '#f59e0b',
    behind: '#ef4444',
  }
  const color = colors[status] || '#64748b'
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: ${color}30;
        border: 3px solid ${color};
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 12px ${color}60;
      ">
        <div style="
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: ${color};
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

// Component to handle map flyTo when site is selected
function MapController({ selectedSite }: { selectedSite: Site | null }) {
  const map = useMap()
  
  useEffect(() => {
    if (selectedSite) {
      map.flyTo([selectedSite.lat, selectedSite.lng], 14, { duration: 1 })
    } else {
      map.flyTo(MAP_CENTER, MAP_ZOOM, { duration: 1 })
    }
  }, [selectedSite, map])
  
  return null
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function RegionalOverview(_props: Record<string, unknown>) {
  const [sites] = useState<Site[]>(SITES)
  const [selectedSite, setSelectedSite] = useState<Site | null>(null)
  const [loading, setLoading] = useState(true)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track': return { bg: 'bg-terra-green', text: 'text-terra-green', border: 'border-terra-green' }
      case 'at_risk': return { bg: 'bg-terra-amber', text: 'text-terra-amber', border: 'border-terra-amber' }
      case 'behind': return { bg: 'bg-terra-red', text: 'text-terra-red', border: 'border-terra-red' }
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
          <div className="w-12 h-12 border-4 border-terra-amber border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading regional data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 animated-grid-bg min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-200 flex items-center gap-3">
          <Map className="text-terra-amber" />
          Regional Overview
        </h1>
        <p className="text-slate-400">Arizona Construction Corridor • {sites.length} Active Sites</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-terra-amber/20 flex items-center justify-center">
              <Layers size={20} className="text-terra-amber" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Active Sites</p>
              <p className="text-2xl font-semibold text-terra-amber">{fleetKPIs.totalSites}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-terra-cyan/20 flex items-center justify-center">
              <Truck size={20} className="text-terra-cyan" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Equipment Units</p>
              <p className="text-2xl font-semibold text-terra-cyan">{fleetKPIs.totalEquipment}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-terra-green/20 flex items-center justify-center">
              <TrendingUp size={20} className="text-terra-green" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Volume Moved</p>
              <p className="text-2xl font-semibold text-terra-green">
                {(fleetKPIs.totalVolume / 1000000).toFixed(1)}M yd³
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-terra-purple/20 flex items-center justify-center">
              <DollarSign size={20} className="text-terra-purple" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Cost per Yard</p>
              <p className="text-2xl font-semibold text-terra-purple">${fleetKPIs.avgCostPerYard}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <TrendingUp size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Fleet Utilization</p>
              <p className="text-2xl font-semibold text-blue-400">{fleetKPIs.fleetUtilization}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Map Area */}
        <div className="col-span-8">
          <div className="card h-[500px] relative overflow-hidden">
            <div className="absolute top-4 left-4 z-[1000] bg-navy-900/90 px-3 py-2 rounded-lg">
              <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Map size={16} className="text-terra-amber" />
                Site Locations - Phoenix, AZ
              </h3>
            </div>
            
            {/* Real Leaflet Map */}
            <MapContainer
              center={MAP_CENTER}
              zoom={MAP_ZOOM}
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
              className="rounded-lg"
            >
              {/* Dark theme tile layer - CARTO Dark Matter */}
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                subdomains="abcd"
              />
              
              {/* Site markers */}
              {sites.map((site) => (
                <Marker
                  key={site.id}
                  position={[site.lat, site.lng]}
                  icon={createMarkerIcon(site.status)}
                  eventHandlers={{
                    click: () => setSelectedSite(site),
                  }}
                >
                  <Popup className="terra-popup">
                    <div className="bg-navy-800 border border-navy-600 rounded-lg p-3 min-w-[200px]">
                      <h4 className="font-semibold text-slate-200">{site.name}</h4>
                      <p className="text-xs text-slate-400 mb-2">{site.type}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Variance:</span>
                        <span className={site.variance >= 0 ? 'text-terra-green' : 'text-terra-red'}>
                          {site.variance >= 0 ? '+' : ''}{site.variance}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs mt-1">
                        <span className="text-slate-400">Equipment:</span>
                        <span className="text-terra-cyan">{site.equipment} units</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
              
              {/* Map controller for animations */}
              <MapController selectedSite={selectedSite} />
            </MapContainer>

            {/* Map legend */}
            <div className="absolute bottom-4 left-4 z-[1000] bg-navy-800/90 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-2">Status</div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-terra-green" />
                  <span className="text-xs text-slate-300">On Track</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-terra-amber" />
                  <span className="text-xs text-slate-300">At Risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-terra-red" />
                  <span className="text-xs text-slate-300">Behind</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Site Details Panel */}
        <div className="col-span-4 space-y-4">
          {/* Selected Site Details */}
          {selectedSite ? (
            <div className="card p-4 animate-slide-up">
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
                  <p className={`text-xl font-mono font-bold ${selectedSite.variance >= 0 ? 'text-terra-green' : 'text-terra-red'}`}>
                    {selectedSite.variance >= 0 ? '+' : ''}{selectedSite.variance}%
                  </p>
                </div>
                <div className="bg-navy-700/50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Equipment</p>
                  <p className="text-xl font-mono font-bold text-terra-cyan">{selectedSite.equipment}</p>
                </div>
                <div className="bg-navy-700/50 rounded-lg p-3 col-span-2">
                  <p className="text-xs text-slate-500">Volume Moved</p>
                  <p className="text-xl font-mono font-bold text-terra-amber">
                    {selectedSite.volume.toLocaleString()} yd³
                  </p>
                </div>
              </div>

              <div className="text-xs text-slate-500 mb-2">Coordinates</div>
              <p className="font-mono text-sm text-slate-400">
                {selectedSite.lat.toFixed(4)}°N, {Math.abs(selectedSite.lng).toFixed(4)}°W
              </p>

              <button 
                className="w-full mt-4 btn-primary flex items-center justify-center gap-2"
                onClick={() => setSelectedSite(null)}
              >
                <ExternalLink size={16} />
                View Site Command
              </button>
            </div>
          ) : (
            <div className="card p-6 text-center">
              <Map size={48} className="mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400">Click a site on the map to view details</p>
            </div>
          )}

          {/* Site Performance List */}
          <div className="card p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-terra-amber" />
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
                        ${selectedSite?.id === site.id ? 'bg-navy-700/50 ring-1 ring-terra-amber/30' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${colors.bg}`} />
                        <span className="text-sm text-slate-200">{site.name}</span>
                      </div>
                      <span className={`font-mono text-sm ${site.variance >= 0 ? 'text-terra-green' : 'text-terra-red'}`}>
                        {site.variance >= 0 ? '+' : ''}{site.variance}%
                      </span>
                    </button>
                  )
                })}
            </div>
          </div>

          {/* Alerts Summary */}
          <div className="card p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
              <AlertTriangle size={16} className="text-terra-amber" />
              Regional Alerts
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-terra-amber/10 rounded-lg border border-terra-amber/20">
                <span className="text-sm text-slate-300">Ghost Cycles Detected</span>
                <span className="text-lg font-mono font-bold text-terra-amber">3</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-terra-orange/10 rounded-lg border border-terra-orange/20">
                <span className="text-sm text-slate-300">Choke Points Active</span>
                <span className="text-lg font-mono font-bold text-terra-orange">2</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-terra-red/10 rounded-lg border border-terra-red/20">
                <span className="text-sm text-slate-300">Sites Behind Schedule</span>
                <span className="text-lg font-mono font-bold text-terra-red">1</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
