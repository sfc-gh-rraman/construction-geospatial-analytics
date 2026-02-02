import { useState, useEffect } from 'react'
import { 
  Sun, 
  AlertTriangle, 
  Target, 
  CheckCircle2, 
  Clock,
  Truck,
  Send,
  Download,
  Copy,
  Compass,
  RefreshCw,
  ChevronDown,
  Cloud,
  Thermometer
} from 'lucide-react'

interface WatchPoint {
  location: string
  issue: string
  source: string
  severity: 'high' | 'medium' | 'low'
}

interface BriefingData {
  date: string
  site: string
  weather: { condition: string; temp: number; wind: string }
  volumeTarget: number
  equipmentAvailable: number
  executiveSummary?: string
  watchPoints: WatchPoint[]
  recommendedActions: string[]
  safetyReminders: string[]
  metadata?: {
    generated_at: string
    gps_points_analyzed: number
    documents_referenced: number
  }
}

const SITES = [
  { id: 'alpha', name: 'Project Alpha' },
  { id: 'beta', name: 'Project Beta' },
  { id: 'gamma', name: 'Project Gamma' },
  { id: 'delta', name: 'Project Delta' },
]

export function DailyBriefing() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [briefing, setBriefing] = useState<BriefingData | null>(null)
  const [copied, setCopied] = useState(false)
  const [selectedSite, setSelectedSite] = useState('alpha')
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Generate mock briefing
    setBriefing({
      date: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      site: SITES.find(s => s.id === selectedSite)?.name || 'Project Alpha',
      weather: { condition: 'Clear', temp: 72, wind: '8 mph NW' },
      volumeTarget: 8500,
      equipmentAvailable: 42,
      executiveSummary: `Good conditions for earthwork today. Yesterday's volume was 8,200 yd³, slightly below target. Ghost Cycle analysis identified 18% fuel waste on North Haul Road - the main priority for today is addressing the stockpile bottleneck at Sector 3. Weather is favorable with no precipitation expected. All 42 units are operational with 2 returning from scheduled maintenance.`,
      watchPoints: [
        {
          location: 'North Road / Stockpile B Intersection',
          issue: 'Choke point causing 12-minute average delays. Trucks queuing extends into active haul lane.',
          source: 'GPS Analysis + Yesterday\'s Cycle Data',
          severity: 'high',
        },
        {
          location: 'Fill Zone B - Northwest Corner',
          issue: 'Soft ground reported. May need additional compaction passes before loading.',
          source: 'Operator Report + Geotech Review',
          severity: 'medium',
        },
        {
          location: 'Unit T-12 (CAT 793)',
          issue: 'High idle time pattern detected (32% vs fleet avg 18%). Check with operator.',
          source: 'Telematics Analysis',
          severity: 'medium',
        },
      ],
      recommendedActions: [
        'Deploy dozer D-04 to relocate Stockpile B approximately 50m east to clear intersection',
        'Route afternoon loads through South alternate route while stockpile is being moved',
        'Schedule compaction assessment in Fill Zone B NW corner before 10:00 AM',
        'Brief T-12 operator on idle time concerns during morning meeting',
      ],
      safetyReminders: [
        'Pedestrian activity expected near office trailers 07:00-08:00 (shift change)',
        'Water truck operations on South Loop - watch for wet road conditions',
        'Survey crew working in Cut Zone A - maintain 50m clearance from survey equipment',
        'Daily equipment walk-around inspections before first load',
      ],
      metadata: {
        generated_at: new Date().toISOString(),
        gps_points_analyzed: 156000,
        documents_referenced: 12,
      },
    })
    
    setIsGenerating(false)
  }

  const handleCopy = () => {
    if (!briefing) return
    const text = generatePlainText()
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const generatePlainText = () => {
    if (!briefing) return ''
    
    return `
MORNING SITE BRIEFING - ${briefing.date}
Site: ${briefing.site}
=====================================

WEATHER: ${briefing.weather.condition}, ${briefing.weather.temp}°F, Wind ${briefing.weather.wind}

${briefing.executiveSummary ? `EXECUTIVE SUMMARY\n${briefing.executiveSummary}\n\n` : ''}

TODAY'S TARGETS
- Volume Target: ${briefing.volumeTarget.toLocaleString()} yd³
- Equipment Available: ${briefing.equipmentAvailable} units

WATCH POINTS
${briefing.watchPoints.map((wp, i) => `
${i + 1}. [${wp.severity.toUpperCase()}] ${wp.location}
   ${wp.issue}
   Source: ${wp.source}
`).join('')}

RECOMMENDED ACTIONS
${briefing.recommendedActions.map((a, i) => `${i + 1}. ${a}`).join('\n')}

SAFETY REMINDERS
${briefing.safetyReminders.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Generated by GROUNDTRUTH using Cortex AI
${briefing.metadata ? `Analyzed ${briefing.metadata.gps_points_analyzed.toLocaleString()} GPS points and ${briefing.metadata.documents_referenced} site documents` : ''}
    `.trim()
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-accent-red bg-accent-red/10 border-accent-red/30'
      case 'medium': return 'text-accent-amber bg-accent-amber/10 border-accent-amber/30'
      case 'low': return 'text-accent-blue bg-accent-blue/10 border-accent-blue/30'
      default: return 'text-slate-400 bg-navy-700 border-navy-600'
    }
  }

  return (
    <div className="p-6 min-h-screen animated-grid-bg">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-200 flex items-center gap-3">
              <Sun className="text-amber-400" />
              Morning Site Briefing
            </h1>
            <p className="text-slate-400 mt-1">
              AI-generated daily briefing powered by Cortex LLM
            </p>
          </div>
        </div>

        {/* Configuration Card */}
        <div className="card mb-6">
          <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
            <Target size={16} className="text-amber-400" />
            Configure Briefing
          </h3>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide block mb-1">Site</label>
              <div className="relative">
                <select 
                  value={selectedSite}
                  onChange={(e) => setSelectedSite(e.target.value)}
                  className="w-full bg-navy-700 border border-navy-600 rounded-lg px-4 py-2.5 text-slate-200 appearance-none cursor-pointer"
                >
                  {SITES.map(site => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide block mb-1">Date</label>
              <input
                type="date"
                defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full bg-navy-700 border border-navy-600 rounded-lg px-4 py-2.5 text-slate-200"
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 
                         disabled:bg-navy-600 text-white rounded-lg transition-colors font-medium"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Compass size={18} />
                    Generate Briefing
                  </>
                )}
              </button>
            </div>
          </div>
          
          {error && (
            <div className="p-3 bg-accent-red/10 border border-accent-red/30 rounded-lg text-accent-red text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Generated Briefing */}
        {briefing && (
          <div className="card animate-slide-up">
            {/* Title Banner */}
            <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 -m-6 mb-6 p-6 rounded-t-xl border-b border-navy-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">{briefing.date}</p>
                  <h2 className="text-xl font-bold text-slate-200 mt-1">
                    Daily Briefing - {briefing.site}
                  </h2>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-3 py-1.5 bg-navy-700 hover:bg-navy-600 
                             text-slate-300 rounded-lg transition-colors text-sm"
                  >
                    {copied ? <CheckCircle2 size={16} className="text-accent-green" /> : <Copy size={16} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button className="flex items-center gap-2 px-3 py-1.5 bg-navy-700 hover:bg-navy-600 
                                   text-slate-300 rounded-lg transition-colors text-sm">
                    <Download size={16} />
                    Export
                  </button>
                  <button className="flex items-center gap-2 px-3 py-1.5 bg-accent-green hover:bg-accent-green/80 
                                   text-white rounded-lg transition-colors text-sm">
                    <Send size={16} />
                    Send to Crew
                  </button>
                </div>
              </div>
            </div>

            {/* Weather Bar */}
            <div className="flex items-center gap-6 mb-6 p-4 bg-navy-700/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Cloud size={20} className="text-cyan-400" />
                <span className="text-slate-300">{briefing.weather.condition}</span>
              </div>
              <div className="flex items-center gap-2">
                <Thermometer size={20} className="text-amber-400" />
                <span className="text-slate-300">{briefing.weather.temp}°F</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Wind:</span>
                <span className="text-slate-300">{briefing.weather.wind}</span>
              </div>
              <div className="ml-auto flex items-center gap-4">
                <div>
                  <span className="text-slate-500 text-sm">Volume Target:</span>
                  <span className="ml-2 text-amber-400 font-mono font-bold">{briefing.volumeTarget.toLocaleString()} yd³</span>
                </div>
                <div>
                  <span className="text-slate-500 text-sm">Equipment:</span>
                  <span className="ml-2 text-cyan-400 font-mono font-bold">{briefing.equipmentAvailable} units</span>
                </div>
              </div>
            </div>

            {/* Executive Summary */}
            {briefing.executiveSummary && (
              <section className="mb-8">
                <div className="bg-gradient-to-r from-amber-500/5 to-orange-500/5 border border-amber-500/20 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-2">
                    <Compass size={16} />
                    AI Executive Summary
                  </h3>
                  <p className="text-slate-300">{briefing.executiveSummary}</p>
                </div>
              </section>
            )}

            {/* Watch Points */}
            <section className="mb-8">
              <h3 className="text-lg font-medium text-slate-200 mb-4 flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-400" />
                Watch Points
              </h3>
              <div className="space-y-3">
                {briefing.watchPoints.map((wp, i) => (
                  <div 
                    key={i}
                    className={`p-4 rounded-lg border ${getSeverityColor(wp.severity)}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                          ${wp.severity === 'high' ? 'bg-accent-red/20 text-accent-red' : 
                            wp.severity === 'medium' ? 'bg-accent-amber/20 text-accent-amber' : 
                            'bg-accent-blue/20 text-accent-blue'}`}>
                          {i + 1}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-slate-200">{wp.location}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getSeverityColor(wp.severity)}`}>
                            {wp.severity}
                          </span>
                        </div>
                        <p className="text-slate-300 text-sm">{wp.issue}</p>
                        <p className="text-xs text-slate-500 mt-1">📊 {wp.source}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Recommended Actions */}
            <section className="mb-8">
              <h3 className="text-lg font-medium text-slate-200 mb-4 flex items-center gap-2">
                <Target size={18} className="text-accent-green" />
                Recommended Actions
              </h3>
              <div className="space-y-2">
                {briefing.recommendedActions.map((action, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-accent-green/5 border border-accent-green/20 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-accent-green/20 flex items-center justify-center text-xs font-bold text-accent-green">
                      {i + 1}
                    </div>
                    <span className="text-slate-300 text-sm">{action}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Safety Reminders */}
            <section>
              <h3 className="text-lg font-medium text-slate-200 mb-4 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-cyan-400" />
                Safety Reminders
              </h3>
              <div className="space-y-2">
                {briefing.safetyReminders.map((reminder, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-navy-700/30 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-cyan-500/10 flex items-center justify-center">
                      <CheckCircle2 size={14} className="text-cyan-400" />
                    </div>
                    <span className="text-slate-300 text-sm">{reminder}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-navy-700 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Generated by GROUNDTRUTH using Cortex AI
                {briefing.metadata && ` • Analyzed ${briefing.metadata.gps_points_analyzed.toLocaleString()} GPS points & ${briefing.metadata.documents_referenced} documents`}
              </p>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-slate-500" />
                <span className="text-xs text-slate-500">
                  {briefing.metadata?.generated_at || new Date().toISOString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!briefing && !isGenerating && (
          <div className="card text-center py-16">
            <Sun size={48} className="mx-auto text-slate-600 mb-4" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">Ready to Generate</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Select a site above, then click "Generate Briefing" to create an 
              AI-powered morning briefing using GPS analytics and site document analysis.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
