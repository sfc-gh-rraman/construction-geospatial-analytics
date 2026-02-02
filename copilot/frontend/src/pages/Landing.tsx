import { useState, useEffect } from 'react'
import { 
  Compass, 
  Search, 
  BarChart3, 
  Shield, 
  ArrowRight,
  Database,
  Map,
  Route,
  Mountain,
  ChevronRight,
  Truck
} from 'lucide-react'

const COPILOT_NAME = "GROUNDTRUTH"

type Page = 'landing' | 'command' | 'regional' | 'haulroad' | 'earthwork' | 'briefing' | 'documents' | 'architecture'

interface LandingProps {
  onNavigate: (page: Page) => void
}

const features = [
  {
    icon: Map,
    title: 'Multi-Site Visibility',
    description: '7 construction sites monitored in real-time with GPS tracking across 152 equipment units.',
    color: 'amber'
  },
  {
    icon: Route,
    title: 'Ghost Cycle Detection',
    description: 'AI correlates GPS tracks with engine load to reveal equipment moving but not hauling.',
    color: 'purple'
  },
  {
    icon: Mountain,
    title: 'Earthwork Progress',
    description: 'Track cut/fill volumes against design plan with drone survey integration.',
    color: 'green'
  },
  {
    icon: Shield,
    title: 'Choke Point Alerts',
    description: 'Proactive identification of haul road bottlenecks with route optimization suggestions.',
    color: 'orange'
  }
]

const stats = [
  { value: '7', label: 'Active Sites', suffix: '' },
  { value: '152', label: 'Equipment Units', suffix: '' },
  { value: '2.4', label: 'GPS Points', suffix: 'M' },
  { value: '4', label: 'AI Agents', suffix: '' },
]

export function Landing({ onNavigate }: LandingProps) {
  const [mounted, setMounted] = useState(false)
  const [typedText, setTypedText] = useState('')
  const fullText = `Hello, I'm ${COPILOT_NAME}. Your intelligent construction site co-pilot.`

  useEffect(() => {
    setMounted(true)
    
    let index = 0
    const interval = setInterval(() => {
      if (index <= fullText.length) {
        setTypedText(fullText.slice(0, index))
        index++
      } else {
        clearInterval(interval)
      }
    }, 40)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-navy-900 topo-bg">
      {/* Hero Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-navy-900/50 via-transparent to-navy-900" />
        
        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-32">
          <div className={`text-center transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {/* Logo */}
            <div className="relative inline-block mb-8">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-2xl shadow-amber-500/30">
                <Compass size={48} className="text-white" />
              </div>
              {/* Animated ring */}
              <div className="absolute inset-0 rounded-2xl border-2 border-amber-400/50 animate-ping" style={{ animationDuration: '3s' }} />
            </div>

            <h1 className="text-6xl font-bold mb-4">
              <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent">
                {COPILOT_NAME}
              </span>
            </h1>
            <p className="text-xl text-slate-400 mb-2">Construction Site Intelligence Platform</p>
            <p className="text-sm text-slate-500 mb-8">Powered by Snowflake Cortex AI</p>

            {/* Typing effect intro */}
            <div className="max-w-2xl mx-auto mb-12">
              <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 text-left">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                    <Compass size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-lg text-slate-200">
                      {typedText}
                      <span className="inline-block w-0.5 h-5 bg-amber-400 ml-1 animate-pulse" />
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => onNavigate('command')}
                className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl text-white font-semibold text-lg shadow-xl shadow-amber-500/30 hover:scale-105 transition-transform"
              >
                Launch Site Command
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => onNavigate('architecture')}
                className="flex items-center gap-2 px-6 py-4 bg-navy-700 border border-navy-600 rounded-xl text-slate-300 font-medium hover:bg-navy-600 transition-colors"
              >
                View Architecture
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className={`bg-navy-800 border-y border-navy-700 py-8 transition-all duration-1000 delay-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-4xl font-bold text-amber-400 metric-glow">
                  {stat.value}<span className="text-2xl">{stat.suffix}</span>
                </p>
                <p className="text-sm text-slate-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className={`text-center mb-12 transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-3xl font-bold text-slate-200 mb-4">Intelligent Construction Operations</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Combining real-time GPS tracking, telematics data, and AI to reveal hidden inefficiencies.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {features.map((feature, i) => {
            const Icon = feature.icon
            return (
              <div 
                key={i}
                className={`bg-navy-800 border border-navy-700 rounded-xl p-8 transition-all duration-500 hover:border-amber-500/30 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transitionDelay: `${600 + i * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4">
                  <Icon size={24} className="text-amber-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-200 mb-2">{feature.title}</h3>
                <p className="text-slate-400">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Hidden Discovery Teaser */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        <div className="bg-gradient-to-r from-purple-500/10 to-amber-500/10 border border-purple-500/20 rounded-xl p-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Truck size={32} className="text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-slate-200 mb-2">🔍 Hidden Discovery: Ghost Cycles</h3>
              <p className="text-slate-400">
                Your trucks appear "active" and cycle times look acceptable. But GROUNDTRUTH reveals that 
                <span className="text-purple-400 font-semibold"> 20% of fuel is wasted </span> 
                on equipment moving but not hauling - coasting at idle while waiting in traffic.
              </p>
            </div>
            <button 
              onClick={() => onNavigate('haulroad')}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
            >
              Explore
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-4 gap-4">
          {([
            { icon: Search, label: 'Site Command', page: 'command' as Page, desc: 'AI Co-Pilot Chat' },
            { icon: Map, label: 'Regional Overview', page: 'regional' as Page, desc: 'Multi-Site Map' },
            { icon: Route, label: 'Haul Road Analytics', page: 'haulroad' as Page, desc: 'Ghost Cycle Detection' },
            { icon: Database, label: 'Document Search', page: 'documents' as Page, desc: 'Site Documents' },
          ]).map((link, i) => {
            const Icon = link.icon
            return (
              <button
                key={i}
                onClick={() => onNavigate(link.page)}
                className="bg-navy-800 border border-navy-700 rounded-xl p-4 text-left group hover:border-amber-500/30 transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Icon size={20} className="text-amber-400" />
                  <span className="font-medium text-slate-200 group-hover:text-amber-400 transition-colors">
                    {link.label}
                  </span>
                  <ChevronRight size={16} className="text-slate-500 ml-auto group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-sm text-slate-500">{link.desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-navy-700 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm text-slate-500">
            Built on <span className="text-amber-400">Snowflake</span> • Cortex AI • Arizona Construction Demo Data
          </p>
        </div>
      </div>
    </div>
  )
}
