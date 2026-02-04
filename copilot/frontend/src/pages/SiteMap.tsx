import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import { Truck, AlertTriangle, Navigation, ArrowLeft } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

interface Equipment {
  id: string
  name: string
  type: 'haul_truck' | 'excavator' | 'loader' | 'dozer'
  lat: number
  lng: number
  status: 'working' | 'idle' | 'ghost_cycle'
  speed: number
  engineLoad: number
  heading: number
}

interface ChokePoint {
  id: string
  name: string
  lat: number
  lng: number
  severity: 'high' | 'medium' | 'low'
  waitTime: number
  equipmentCount: number
}

// Component to fit bounds
function FitBounds({ equipment }: { equipment: Equipment[] }) {
  const map = useMap()
  
  useEffect(() => {
    if (equipment.length > 0) {
      const bounds = equipment.map(e => [e.lat, e.lng] as [number, number])
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [equipment, map])
  
  return null
}

export function SiteMap() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [chokePoints, setChokePoints] = useState<ChokePoint[]>([])
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch from API - for now use fallback data
      // const res = await fetch('/api/site/alpha/equipment')
      // const data = await res.json()
      
      // Fallback data with real Phoenix coordinates
      setEquipment([
        { id: 'H-01', name: 'CAT 793 #1', type: 'haul_truck', lat: 33.4520, lng: -112.0840, status: 'working', speed: 18, engineLoad: 75, heading: 45 },
        { id: 'H-02', name: 'CAT 793 #2', type: 'haul_truck', lat: 33.4515, lng: -112.0825, status: 'ghost_cycle', speed: 3, engineLoad: 18, heading: 180 },
        { id: 'H-03', name: 'CAT 793 #3', type: 'haul_truck', lat: 33.4508, lng: -112.0850, status: 'working', speed: 22, engineLoad: 82, heading: 270 },
        { id: 'H-04', name: 'CAT 793 #4', type: 'haul_truck', lat: 33.4525, lng: -112.0815, status: 'idle', speed: 0, engineLoad: 12, heading: 90 },
        { id: 'E-01', name: 'CAT D10 #1', type: 'excavator', lat: 33.4512, lng: -112.0835, status: 'working', speed: 0, engineLoad: 65, heading: 0 },
        { id: 'L-01', name: 'CAT 992 #1', type: 'loader', lat: 33.4518, lng: -112.0830, status: 'working', speed: 5, engineLoad: 70, heading: 135 },
      ])
      
      setChokePoints([
        { id: 'cp-1', name: 'Stockpile B Intersection', lat: 33.4522, lng: -112.0820, severity: 'high', waitTime: 12, equipmentCount: 4 },
        { id: 'cp-2', name: 'North Road Bend', lat: 33.4530, lng: -112.0845, severity: 'medium', waitTime: 5, equipmentCount: 2 },
      ])
    } catch (error) {
      console.error('Failed to fetch equipment:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working': return '#22c55e'
      case 'idle': return '#64748b'
      case 'ghost_cycle': return '#f97316'
      default: return '#64748b'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#ef4444'
      case 'medium': return '#f59e0b'
      case 'low': return '#22c55e'
      default: return '#64748b'
    }
  }

  const ghostCycleCount = equipment.filter(e => e.status === 'ghost_cycle').length

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-terra-amber border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full flex" style={{ minHeight: 'calc(100vh - 120px)' }}>
      {/* Map */}
      <div className="flex-1 relative" style={{ minHeight: '500px' }}>
        {/* Stats overlay */}
        <div className="absolute top-4 left-4 z-[1000] flex gap-3">
          <div className="card px-4 py-2 flex items-center gap-2">
            <Truck size={18} className="text-terra-amber" />
            <span className="text-lg font-bold text-white">{equipment.length}</span>
            <span className="text-sm text-slate-400">Equipment</span>
          </div>
          {ghostCycleCount > 0 && (
            <div className="card px-4 py-2 flex items-center gap-2 border-orange-500/50">
              <AlertTriangle size={18} className="text-orange-400" />
              <span className="text-lg font-bold text-orange-400">{ghostCycleCount}</span>
              <span className="text-sm text-slate-400">Ghost Cycles</span>
            </div>
          )}
        </div>

        <MapContainer
          center={[33.4515, -112.0832]}
          zoom={16}
          className="absolute inset-0"
          style={{ background: '#0d1117', height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
          />
          <FitBounds equipment={equipment} />

          {/* Choke Points */}
          {chokePoints.map(cp => (
            <CircleMarker
              key={cp.id}
              center={[cp.lat, cp.lng]}
              radius={20}
              pathOptions={{
                color: getSeverityColor(cp.severity),
                fillColor: getSeverityColor(cp.severity),
                fillOpacity: 0.3,
                weight: 2,
                dashArray: '5, 5'
              }}
            >
              <Popup>
                <div className="p-2 bg-navy-800 rounded min-w-[180px]">
                  <div className="font-bold text-white">{cp.name}</div>
                  <div className="text-sm text-red-400">⚠️ Choke Point - {cp.severity}</div>
                  <div className="text-sm text-slate-400">Wait time: {cp.waitTime} min</div>
                  <div className="text-sm text-slate-400">{cp.equipmentCount} trucks waiting</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* Equipment */}
          {equipment.map(eq => (
            <CircleMarker
              key={eq.id}
              center={[eq.lat, eq.lng]}
              radius={eq.status === 'ghost_cycle' ? 10 : 8}
              pathOptions={{
                color: getStatusColor(eq.status),
                fillColor: getStatusColor(eq.status),
                fillOpacity: 0.8,
                weight: eq.status === 'ghost_cycle' ? 3 : 2
              }}
              eventHandlers={{
                click: () => setSelectedEquipment(eq)
              }}
            >
              <Popup>
                <div className="p-2 min-w-[180px] bg-navy-800 rounded">
                  <div className="font-bold text-white">{eq.name}</div>
                  <div className="text-xs text-slate-400 mb-2">{eq.id}</div>
                  
                  <div className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-2 ${
                    eq.status === 'ghost_cycle' ? 'bg-orange-500/20 text-orange-400' :
                    eq.status === 'working' ? 'bg-green-500/20 text-green-400' :
                    'bg-slate-500/20 text-slate-400'
                  }`}>
                    {eq.status === 'ghost_cycle' ? '⚠️ GHOST CYCLE' : eq.status.toUpperCase()}
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Speed:</span>
                      <span className="text-white">{eq.speed} mph</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Engine Load:</span>
                      <span className={eq.engineLoad < 30 ? 'text-orange-400' : 'text-white'}>
                        {eq.engineLoad}%
                      </span>
                    </div>
                  </div>
                  
                  {eq.status === 'ghost_cycle' && (
                    <div className="mt-2 p-2 bg-orange-500/10 rounded text-xs text-orange-300">
                      Moving ({eq.speed} mph) but low engine load ({eq.engineLoad}%) = wasting fuel
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-[1000] card p-3">
          <div className="text-xs font-medium text-slate-400 mb-2">Status</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs text-slate-300">Working</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-500" />
              <span className="text-xs text-slate-300">Idle</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-xs text-slate-300">Ghost Cycle</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-dashed border-red-500" />
              <span className="text-xs text-slate-300">Choke Point</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-80 border-l border-navy-700 bg-navy-900/50 overflow-y-auto p-4">
        {selectedEquipment ? (
          <div>
            <button
              onClick={() => setSelectedEquipment(null)}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4"
            >
              <ArrowLeft size={16} /> Back to list
            </button>
            
            <div className="card p-4">
              <h3 className="font-bold text-white text-lg">{selectedEquipment.name}</h3>
              <p className="text-sm text-slate-500 mb-4">{selectedEquipment.id}</p>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Status</span>
                  <span className={
                    selectedEquipment.status === 'ghost_cycle' ? 'text-orange-400' :
                    selectedEquipment.status === 'working' ? 'text-green-400' :
                    'text-slate-400'
                  }>
                    {selectedEquipment.status === 'ghost_cycle' ? 'Ghost Cycle ⚠️' : selectedEquipment.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Speed</span>
                  <span className="text-white">{selectedEquipment.speed} mph</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Engine Load</span>
                  <span className="text-white">{selectedEquipment.engineLoad}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Heading</span>
                  <span className="text-white flex items-center gap-1">
                    <Navigation size={14} style={{ transform: `rotate(${selectedEquipment.heading}deg)` }} />
                    {selectedEquipment.heading}°
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h3 className="font-medium text-slate-200 mb-4">Equipment List</h3>
            <div className="space-y-2">
              {equipment.map(eq => (
                <button
                  key={eq.id}
                  onClick={() => setSelectedEquipment(eq)}
                  className={`w-full card p-3 text-left hover:border-terra-amber/30 transition ${
                    eq.status === 'ghost_cycle' ? 'border-orange-500/30' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-200">{eq.name}</div>
                      <div className="text-xs text-slate-500">{eq.id}</div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${
                      eq.status === 'ghost_cycle' ? 'bg-orange-500 animate-pulse' :
                      eq.status === 'working' ? 'bg-green-500' :
                      'bg-slate-500'
                    }`} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
