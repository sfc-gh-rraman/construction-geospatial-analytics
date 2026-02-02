import { useState } from 'react'
import { MapPin, Truck, AlertTriangle, Navigation } from 'lucide-react'

interface MapEquipment {
  id: string
  type: 'haul_truck' | 'excavator' | 'loader'
  lat: number
  lng: number
  status: 'working' | 'idle' | 'ghost_cycle'
  heading: number
}

interface ChokePoint {
  id: string
  name: string
  lat: number
  lng: number
  severity: 'high' | 'medium' | 'low'
  waitTime: number
}

export function SiteMap() {
  const [equipment] = useState<MapEquipment[]>([
    { id: 'HT-201', type: 'haul_truck', lat: 37.7749, lng: -122.4194, status: 'working', heading: 45 },
    { id: 'HT-202', type: 'haul_truck', lat: 37.7755, lng: -122.4180, status: 'idle', heading: 180 },
    { id: 'HT-203', type: 'haul_truck', lat: 37.7740, lng: -122.4210, status: 'working', heading: 270 },
    { id: 'HT-204', type: 'haul_truck', lat: 37.7765, lng: -122.4165, status: 'ghost_cycle', heading: 90 },
    { id: 'EX-101', type: 'excavator', lat: 37.7745, lng: -122.4200, status: 'working', heading: 0 },
    { id: 'LD-301', type: 'loader', lat: 37.7752, lng: -122.4188, status: 'working', heading: 135 },
  ])

  const [chokePoints] = useState<ChokePoint[]>([
    { id: 'cp-1', name: 'Zone B3 - Main Haul Road', lat: 37.7760, lng: -122.4175, severity: 'high', waitTime: 15 },
    { id: 'cp-2', name: 'Zone A1 - Load Area', lat: 37.7742, lng: -122.4205, severity: 'low', waitTime: 5 },
  ])

  const [selectedEquipment, setSelectedEquipment] = useState<MapEquipment | null>(null)

  const getMarkerColor = (status: string) => {
    switch (status) {
      case 'working': return 'bg-accent-emerald'
      case 'idle': return 'bg-stone-500'
      case 'ghost_cycle': return 'bg-orange-500 animate-pulse'
      default: return 'bg-stone-500'
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
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-earth-800/80 backdrop-blur border-b border-earth-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-display font-semibold text-stone-200">Site Map</h1>
            <p className="text-sm text-stone-400">Real-time equipment and traffic visualization</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Legend */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent-emerald" />
                <span className="text-stone-400">Working</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-stone-500" />
                <span className="text-stone-400">Idle</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
                <span className="text-stone-400">Ghost Cycle</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-stone-400">Choke Point</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Map Area (Placeholder - would integrate with Mapbox/Google Maps) */}
        <div className="flex-1 relative bg-earth-900 topo-pattern">
          {/* Simulated map visualization */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-[600px] h-[400px] border border-earth-700 rounded-xl bg-earth-800/50">
              {/* Grid lines */}
              <div className="absolute inset-0 grid grid-cols-6 grid-rows-4">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="border border-earth-700/30" />
                ))}
              </div>

              {/* Zone labels */}
              <div className="absolute top-2 left-2 text-xs text-stone-600">Zone A</div>
              <div className="absolute top-2 right-2 text-xs text-stone-600">Zone B</div>
              <div className="absolute bottom-2 left-2 text-xs text-stone-600">Zone C</div>
              <div className="absolute bottom-2 right-2 text-xs text-stone-600">Zone D</div>

              {/* Haul roads (simplified) */}
              <svg className="absolute inset-0 w-full h-full">
                <path 
                  d="M 50 200 Q 150 180 300 200 Q 450 220 550 200" 
                  stroke="#3d352e" 
                  strokeWidth="20" 
                  fill="none"
                />
                <path 
                  d="M 300 50 L 300 350" 
                  stroke="#3d352e" 
                  strokeWidth="15" 
                  fill="none"
                />
              </svg>

              {/* Choke Points */}
              {chokePoints.map((cp) => (
                <div
                  key={cp.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                  style={{ left: `${(cp.lng + 122.42) * 10000}%`, top: `${(37.78 - cp.lat) * 10000}%` }}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    cp.severity === 'high' ? 'bg-red-500/30 border-2 border-red-500' : 'bg-yellow-500/30 border-2 border-yellow-500'
                  } animate-pulse`}>
                    <AlertTriangle size={14} className={cp.severity === 'high' ? 'text-red-400' : 'text-yellow-400'} />
                  </div>
                  <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs bg-earth-800 px-2 py-1 rounded text-stone-300">{cp.name}</span>
                  </div>
                </div>
              ))}

              {/* Equipment markers */}
              {equipment.map((eq) => (
                <div
                  key={eq.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-125"
                  style={{ 
                    left: `${((eq.lng + 122.425) / 0.015) * 100}%`, 
                    top: `${((37.78 - eq.lat) / 0.01) * 100}%` 
                  }}
                  onClick={() => setSelectedEquipment(eq)}
                >
                  <div className={`w-6 h-6 rounded-full ${getMarkerColor(eq.status)} flex items-center justify-center text-xs shadow-lg`}>
                    {eq.type === 'haul_truck' ? '🚚' : eq.type === 'excavator' ? '🏗️' : '🚜'}
                  </div>
                </div>
              ))}

              {/* Load and dump sites */}
              <div className="absolute left-[10%] top-[30%] w-16 h-16 border-2 border-dashed border-accent-amber/50 rounded-lg flex items-center justify-center">
                <span className="text-xs text-accent-amber">LOAD</span>
              </div>
              <div className="absolute right-[10%] bottom-[30%] w-16 h-16 border-2 border-dashed border-accent-cyan/50 rounded-lg flex items-center justify-center">
                <span className="text-xs text-accent-cyan">DUMP</span>
              </div>
            </div>
          </div>

          {/* Map placeholder message */}
          <div className="absolute bottom-4 left-4 card px-3 py-2">
            <p className="text-xs text-stone-500">
              <MapPin size={12} className="inline mr-1" />
              Map visualization placeholder - integrate with Mapbox/Google Maps for production
            </p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 border-l border-earth-700 bg-earth-800/50 overflow-y-auto custom-scrollbar">
          {/* Selected equipment details */}
          {selectedEquipment ? (
            <div className="p-4 border-b border-earth-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-stone-200">Equipment Details</h3>
                <button 
                  onClick={() => setSelectedEquipment(null)}
                  className="text-stone-500 hover:text-stone-300"
                >
                  ✕
                </button>
              </div>
              <div className="card p-4">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{getEquipmentIcon(selectedEquipment.type)}</span>
                  <div>
                    <p className="font-mono font-semibold text-stone-200">{selectedEquipment.id}</p>
                    <p className="text-xs text-stone-500 capitalize">{selectedEquipment.type.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Status</span>
                    <span className={`${
                      selectedEquipment.status === 'working' ? 'text-accent-emerald' :
                      selectedEquipment.status === 'ghost_cycle' ? 'text-orange-400' : 'text-stone-400'
                    }`}>
                      {selectedEquipment.status === 'ghost_cycle' ? 'Ghost Cycle' : selectedEquipment.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Heading</span>
                    <span className="text-stone-300 flex items-center gap-1">
                      <Navigation size={12} style={{ transform: `rotate(${selectedEquipment.heading}deg)` }} />
                      {selectedEquipment.heading}°
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 border-b border-earth-700">
              <h3 className="font-semibold text-stone-200 mb-2">Site Overview</h3>
              <p className="text-sm text-stone-400">Click on equipment markers to view details</p>
            </div>
          )}

          {/* Choke Points List */}
          <div className="p-4">
            <h3 className="font-semibold text-stone-200 mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400" />
              Active Choke Points
            </h3>
            <div className="space-y-3">
              {chokePoints.map((cp) => (
                <div key={cp.id} className={`card p-3 ${cp.severity === 'high' ? 'choke-point' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 mt-1.5 rounded-full ${
                      cp.severity === 'high' ? 'bg-red-500' : 'bg-yellow-500'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-stone-200">{cp.name}</p>
                      <p className="text-xs text-stone-500">Est. wait: {cp.waitTime} min</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Equipment List */}
          <div className="p-4 border-t border-earth-700">
            <h3 className="font-semibold text-stone-200 mb-3 flex items-center gap-2">
              <Truck size={16} className="text-accent-amber" />
              Equipment ({equipment.length})
            </h3>
            <div className="space-y-2">
              {equipment.map((eq) => (
                <button
                  key={eq.id}
                  onClick={() => setSelectedEquipment(eq)}
                  className={`w-full card p-2 text-left hover:border-accent-amber/30 transition-colors ${
                    selectedEquipment?.id === eq.id ? 'border-accent-amber/50' : ''
                  } ${eq.status === 'ghost_cycle' ? 'ghost-cycle' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <span>{getEquipmentIcon(eq.type)}</span>
                    <span className="font-mono text-sm text-stone-300">{eq.id}</span>
                    <div className={`ml-auto w-2 h-2 rounded-full ${getMarkerColor(eq.status)}`} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
