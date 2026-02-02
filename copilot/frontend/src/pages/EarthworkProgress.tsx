import { useState, useEffect } from 'react'
import { Mountain, Calendar, Play, Pause, SkipBack, SkipForward, TrendingUp, Volume2, Layers } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
} from 'recharts'

// Survey dates with volume data
const surveyDates = [
  { date: '2026-01-25', cutVolume: 385000, fillVolume: 245000, cutPlan: 400000, fillPlan: 280000 },
  { date: '2026-01-26', cutVolume: 392000, fillVolume: 260000, cutPlan: 408000, fillPlan: 295000 },
  { date: '2026-01-27', cutVolume: 405000, fillVolume: 282000, cutPlan: 416000, fillPlan: 310000 },
  { date: '2026-01-28', cutVolume: 418000, fillVolume: 298000, cutPlan: 424000, fillPlan: 325000 },
  { date: '2026-01-29', cutVolume: 428000, fillVolume: 312000, cutPlan: 432000, fillPlan: 340000 },
  { date: '2026-01-30', cutVolume: 438000, fillVolume: 328000, cutPlan: 440000, fillPlan: 355000 },
]

// Zone-level data for heatmap simulation
const zones = [
  { id: 'A1', name: 'Cut Zone North', type: 'cut', actual: 125000, plan: 130000, status: 'on_track' },
  { id: 'A2', name: 'Cut Zone Central', type: 'cut', actual: 180000, plan: 175000, status: 'ahead' },
  { id: 'A3', name: 'Cut Zone South', type: 'cut', actual: 133000, plan: 145000, status: 'behind' },
  { id: 'B1', name: 'Fill Zone West', type: 'fill', actual: 145000, plan: 160000, status: 'behind' },
  { id: 'B2', name: 'Fill Zone East', type: 'fill', actual: 183000, plan: 180000, status: 'on_track' },
]

// Cross-section data points
const crossSectionData = [
  { station: 0, design: 100, actual: 100 },
  { station: 50, design: 95, actual: 96 },
  { station: 100, design: 88, actual: 90 },
  { station: 150, design: 82, actual: 85 },  // Behind
  { station: 200, design: 78, actual: 82 },  // Behind
  { station: 250, design: 85, actual: 86 },
  { station: 300, design: 92, actual: 91 },
  { station: 350, design: 98, actual: 97 },
  { station: 400, design: 100, actual: 100 },
]

export function EarthworkProgress() {
  const [selectedDate, setSelectedDate] = useState(surveyDates.length - 1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)

  const currentSurvey = surveyDates[selectedDate]

  // Calculate progress percentages
  const cutProgress = ((currentSurvey.cutVolume / currentSurvey.cutPlan) * 100).toFixed(1)
  const fillProgress = ((currentSurvey.fillVolume / currentSurvey.fillPlan) * 100).toFixed(1)
  const overallProgress = (((currentSurvey.cutVolume + currentSurvey.fillVolume) / 
    (currentSurvey.cutPlan + currentSurvey.fillPlan)) * 100).toFixed(1)

  // Playback logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    
    if (isPlaying && selectedDate < surveyDates.length - 1) {
      interval = setInterval(() => {
        setSelectedDate(prev => {
          if (prev >= surveyDates.length - 1) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, 1500 / playbackSpeed)
    }

    return () => clearInterval(interval)
  }, [isPlaying, selectedDate, playbackSpeed])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ahead': return { bg: 'bg-accent-green', text: 'text-accent-green' }
      case 'on_track': return { bg: 'bg-accent-blue', text: 'text-accent-blue' }
      case 'behind': return { bg: 'bg-accent-red', text: 'text-accent-red' }
      default: return { bg: 'bg-slate-500', text: 'text-slate-500' }
    }
  }

  return (
    <div className="p-6 animated-grid-bg min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-200 flex items-center gap-3">
          <Mountain className="text-amber-400" />
          Earthwork Progress
        </h1>
        <p className="text-slate-400">Project Alpha • Cut/Fill Volume Tracking</p>
      </div>

      {/* Timeline Player */}
      <div className="card mb-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedDate(0)}
              className="p-2 rounded-lg bg-navy-700 hover:bg-navy-600 transition-colors"
            >
              <SkipBack size={18} className="text-slate-400" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-3 rounded-full bg-amber-500 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/30"
            >
              {isPlaying ? (
                <Pause size={20} className="text-white" />
              ) : (
                <Play size={20} className="text-white ml-0.5" />
              )}
            </button>
            <button
              onClick={() => setSelectedDate(surveyDates.length - 1)}
              className="p-2 rounded-lg bg-navy-700 hover:bg-navy-600 transition-colors"
            >
              <SkipForward size={18} className="text-slate-400" />
            </button>
          </div>

          {/* Timeline Slider */}
          <div className="flex-1">
            <div className="relative h-2 bg-navy-700 rounded-full">
              <div
                className="absolute h-full bg-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${(selectedDate / (surveyDates.length - 1)) * 100}%` }}
              />
              {surveyDates.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedDate(i)}
                  className={`absolute w-4 h-4 rounded-full -top-1 transform -translate-x-1/2 transition-all
                    ${i <= selectedDate ? 'bg-amber-500' : 'bg-navy-600 border-2 border-navy-500'}
                    ${i === selectedDate ? 'ring-4 ring-amber-500/30 scale-125' : ''}`}
                  style={{ left: `${(i / (surveyDates.length - 1)) * 100}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-500">
              {surveyDates.map((s, i) => (
                <span key={i} className={i === selectedDate ? 'text-amber-400 font-medium' : ''}>
                  {s.date.split('-').slice(1).join('/')}
                </span>
              ))}
            </div>
          </div>

          {/* Current Date Display */}
          <div className="text-right">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-amber-400" />
              <span className="text-xl font-mono font-bold text-amber-400">{currentSurvey.date}</span>
            </div>
            <span className="text-xs text-slate-500">Survey Date</span>
          </div>

          {/* Playback Speed */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Speed:</span>
            {[0.5, 1, 2].map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                  playbackSpeed === speed
                    ? 'bg-amber-500 text-white'
                    : 'bg-navy-700 text-slate-400 hover:bg-navy-600'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Progress KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card card-glow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
              <Mountain size={24} className="text-red-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Cut Progress</p>
              <p className="text-2xl font-mono font-bold text-red-400">{cutProgress}%</p>
              <p className="text-xs text-slate-500">{(currentSurvey.cutVolume / 1000).toFixed(0)}k yd³</p>
            </div>
          </div>
        </div>
        <div className="card card-glow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Layers size={24} className="text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Fill Progress</p>
              <p className="text-2xl font-mono font-bold text-green-400">{fillProgress}%</p>
              <p className="text-xs text-slate-500">{(currentSurvey.fillVolume / 1000).toFixed(0)}k yd³</p>
            </div>
          </div>
        </div>
        <div className="card card-glow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <TrendingUp size={24} className="text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Overall Progress</p>
              <p className="text-2xl font-mono font-bold text-amber-400">{overallProgress}%</p>
              <p className="text-xs text-slate-500">vs plan</p>
            </div>
          </div>
        </div>
        <div className="card card-glow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <Volume2 size={24} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Today's Volume</p>
              <p className="text-2xl font-mono font-bold text-cyan-400">
                {selectedDate > 0 ? 
                  ((surveyDates[selectedDate].cutVolume - surveyDates[selectedDate-1].cutVolume) / 1000).toFixed(0) + 'k' : 
                  '0'}
              </p>
              <p className="text-xs text-slate-500">cubic yards moved</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Main Charts */}
        <div className="col-span-8 space-y-6">
          {/* Volume Progress Chart */}
          <div className="card">
            <h3 className="text-lg font-medium text-slate-200 mb-4">Volume Progress vs Plan</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={surveyDates.slice(0, selectedDate + 1)}>
                  <defs>
                    <linearGradient id="cutGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="fillGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" tickFormatter={(d) => d.split('-').slice(1).join('/')} />
                  <YAxis stroke="#94a3b8" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${(value/1000).toFixed(0)}k yd³`, '']}
                  />
                  
                  {/* Plan lines (dashed) */}
                  <Line type="monotone" dataKey="cutPlan" stroke="#ef4444" strokeDasharray="5 5" strokeWidth={2} dot={false} name="Cut Plan" />
                  <Line type="monotone" dataKey="fillPlan" stroke="#10b981" strokeDasharray="5 5" strokeWidth={2} dot={false} name="Fill Plan" />
                  
                  {/* Actual areas */}
                  <Area type="monotone" dataKey="cutVolume" stroke="#ef4444" strokeWidth={2} fill="url(#cutGradient)" name="Cut Actual" />
                  <Area type="monotone" dataKey="fillVolume" stroke="#10b981" strokeWidth={2} fill="url(#fillGradient)" name="Fill Actual" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-red-400" />
                <span className="text-slate-400">Cut Actual</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-red-400" style={{ borderBottom: '2px dashed' }} />
                <span className="text-slate-400">Cut Plan</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-green-400" />
                <span className="text-slate-400">Fill Actual</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-green-400" style={{ borderBottom: '2px dashed' }} />
                <span className="text-slate-400">Fill Plan</span>
              </div>
            </div>
          </div>

          {/* Cross Section */}
          <div className="card">
            <h3 className="text-lg font-medium text-slate-200 mb-4">Cross Section: Design vs Actual</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={crossSectionData}>
                  <defs>
                    <linearGradient id="designGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="station" stroke="#94a3b8" label={{ value: 'Station (m)', position: 'bottom', fill: '#94a3b8' }} />
                  <YAxis stroke="#94a3b8" reversed domain={[70, 105]} label={{ value: 'Elevation (m)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                  />
                  <Area type="monotone" dataKey="design" stroke="#3b82f6" fill="url(#designGrad)" strokeWidth={2} name="Design Surface" />
                  <Line type="monotone" dataKey="actual" stroke="#f59e0b" strokeWidth={3} dot name="Actual Surface" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm text-amber-400">
                ⚠️ Station 150-200m is <span className="font-semibold">2.5m behind design grade</span>. 
                Additional fill material required.
              </p>
            </div>
          </div>
        </div>

        {/* Zone Status */}
        <div className="col-span-4 space-y-6">
          {/* Diff Map Placeholder */}
          <div className="card">
            <h3 className="text-lg font-medium text-slate-200 mb-4">Elevation Change Heatmap</h3>
            <div className="aspect-square bg-navy-700/50 rounded-lg relative overflow-hidden">
              {/* Simulated heatmap grid */}
              <div className="absolute inset-4 grid grid-cols-5 grid-rows-5 gap-1">
                {[...Array(25)].map((_, i) => {
                  const isCut = i < 10
                  const intensity = Math.random()
                  return (
                    <div
                      key={i}
                      className={`rounded ${isCut ? 'bg-red-500' : 'bg-green-500'}`}
                      style={{ opacity: 0.2 + intensity * 0.6 }}
                    />
                  )
                })}
              </div>
              
              {/* Legend */}
              <div className="absolute bottom-4 left-4 right-4 flex justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded" />
                  <span className="text-slate-400">Cut</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded" />
                  <span className="text-slate-400">Fill</span>
                </div>
              </div>
            </div>
          </div>

          {/* Zone Status */}
          <div className="card">
            <h3 className="text-lg font-medium text-slate-200 mb-4">Zone Status</h3>
            <div className="space-y-3">
              {zones.map((zone) => {
                const colors = getStatusColor(zone.status)
                const progress = ((zone.actual / zone.plan) * 100).toFixed(0)
                return (
                  <div key={zone.id} className="p-3 bg-navy-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${zone.type === 'cut' ? 'bg-red-400' : 'bg-green-400'}`} />
                        <span className="text-sm text-slate-200">{zone.name}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg}/20 ${colors.text}`}>
                        {zone.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="h-1.5 bg-navy-600 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${zone.type === 'cut' ? 'bg-red-400' : 'bg-green-400'}`}
                        style={{ width: `${Math.min(100, Number(progress))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>{(zone.actual / 1000).toFixed(0)}k yd³</span>
                      <span>{progress}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
