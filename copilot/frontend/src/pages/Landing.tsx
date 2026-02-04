import { useState, useEffect } from 'react'
import { 
  Compass, 
  BarChart3, 
  Shield, 
  ArrowRight,
  Map,
  Route,
  Mountain,
  ChevronRight,
  Truck,
  TrendingUp,
  Calendar
} from 'lucide-react'
import type { Page } from '../App'

const COPILOT_NAME = "TERRA"

interface LandingProps {
  onNavigate: (page: Page) => void
}

const features = [
  {
    icon: Compass,
    title: 'Multi-Agent Intelligence',
    description: '4 specialized AI agents analyzing fleet efficiency, route optimization, terrain progress, and cycle predictions.',
    color: 'amber'
  },
  {
    icon: Route,
    title: 'Ghost Cycle Detection',
    description: 'Hidden discovery engine correlates GPS tracks with engine load to reveal equipment moving but not hauling.',
    color: 'purple'
  },
  {
    icon: Mountain,
    title: 'Earthwork Analytics',
    description: 'Track cut/fill volumes against design plan with drone survey integration and progress forecasting.',
    color: 'green'
  },
  {
    icon: Shield,
    title: 'Choke Point Prediction',
    description: 'ML-powered early warning system identifies haul road bottlenecks before they cause delays.',
    color: 'red'
  }
]

const stats = [
  { value: '8', label: 'Active Sites', suffix: '' },
  { value: '152', label: 'Equipment Units', suffix: '' },
  { value: '2.4', label: 'GPS Points Today', suffix: 'M' },
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
    <div className="min-h-screen bg-navy-900 overflow-y-auto">
      {/* Hero Section */}
      <div className="relative">
        {/* Animated background gradient */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-terra-amber/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-terra-orange/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-navy-900/50 via-transparent to-navy-900" />
        
        <div className="relative max-w-7xl mx-auto px-6 pt-16 pb-24">
          <div className={`text-center transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {/* Logo */}
            <div className="relative inline-block mb-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-terra-amber to-terra-orange flex items-center justify-center shadow-2xl shadow-terra-amber/30">
                <Compass size={40} className="text-white" />
              </div>
              {/* Glow effect */}
              <div className="absolute inset-0 w-20 h-20 rounded-2xl bg-gradient-to-br from-terra-amber to-terra-orange blur-xl opacity-50" />
            </div>

            <h1 className="text-5xl font-bold mb-3">
              <span className="bg-gradient-to-r from-terra-amber via-amber-400 to-terra-orange bg-clip-text text-transparent">
                {COPILOT_NAME}
              </span>
            </h1>
            <p className="text-lg text-slate-400 mb-1">Terrain & Equipment Route Resource Advisor</p>
            <p className="text-sm text-slate-500 mb-6">Powered by Snowflake Cortex AI</p>

            {/* Typing effect intro */}
            <div className="max-w-2xl mx-auto mb-10">
              <div className="bg-navy-800/80 backdrop-blur-sm border border-navy-700 rounded-xl p-5 text-left">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-terra-amber to-terra-orange flex items-center justify-center flex-shrink-0">
                    <Compass size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-lg text-slate-200">
                      {typedText}
                      <span className="inline-block w-0.5 h-5 bg-terra-amber ml-1 animate-pulse" />
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => onNavigate('regional')}
                className="group flex items-center gap-3 px-7 py-3.5 bg-gradient-to-r from-terra-amber to-terra-orange rounded-xl text-white font-semibold text-lg shadow-xl shadow-terra-amber/25 hover:shadow-terra-amber/40 hover:scale-105 transition-all"
              >
                Launch Regional Command
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => onNavigate('architecture')}
                className="flex items-center gap-2 px-5 py-3.5 bg-navy-700/50 border border-navy-600 rounded-xl text-slate-300 font-medium hover:bg-navy-600/50 hover:border-navy-500 transition-all"
              >
                View Architecture
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className={`bg-navy-800/50 border-y border-navy-700/50 py-6 transition-all duration-1000 delay-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl font-bold text-terra-amber">
                  {stat.value}<span className="text-xl">{stat.suffix}</span>
                </p>
                <p className="text-sm text-slate-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className={`text-center mb-10 transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-2xl font-bold text-slate-200 mb-3">Intelligent Construction Operations</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Combining real-time GPS tracking, telematics data, and AI to reveal hidden inefficiencies and optimize site operations.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-5">
          {features.map((feature, i) => {
            const Icon = feature.icon
            const colorClass = {
              amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400',
              purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
              green: 'from-green-500/20 to-green-600/10 border-green-500/30 text-green-400',
              red: 'from-red-500/20 to-red-600/10 border-red-500/30 text-red-400',
            }[feature.color]
            
            return (
              <div 
                key={i}
                className={`bg-gradient-to-br ${colorClass} border rounded-xl p-6 transition-all duration-500 hover:scale-[1.02] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transitionDelay: `${600 + i * 100}ms` }}
              >
                <div className="w-11 h-11 rounded-xl bg-navy-800/80 flex items-center justify-center mb-4">
                  <Icon size={22} />
                </div>
                <h3 className="text-lg font-semibold text-slate-200 mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick Links */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-4 gap-3">
          {([
            { icon: TrendingUp, label: 'Regional Command', page: 'regional' as Page, desc: 'Multi-site overview' },
            { icon: Map, label: 'Site Operations', page: 'siteops' as Page, desc: 'Live equipment tracking' },
            { icon: BarChart3, label: 'Earthwork Analytics', page: 'earthwork' as Page, desc: 'Ghost Cycle detection' },
            { icon: Calendar, label: 'Daily Brief', page: 'brief' as Page, desc: 'AI-generated summary' },
          ]).map((link, i) => {
            const Icon = link.icon
            return (
              <button
                key={i}
                onClick={() => onNavigate(link.page)}
                className="bg-navy-800/50 border border-navy-700/50 rounded-xl p-4 text-left group hover:border-terra-amber/30 hover:bg-navy-800/80 transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Icon size={18} className="text-terra-amber" />
                  <span className="font-medium text-slate-200 group-hover:text-terra-amber transition-colors text-sm">
                    {link.label}
                  </span>
                  <ChevronRight size={14} className="text-slate-500 ml-auto group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-xs text-slate-500">{link.desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Hidden Discovery Highlight */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        <div className={`bg-gradient-to-r from-terra-amber/10 to-purple-500/10 border border-terra-amber/30 rounded-xl p-6 transition-all duration-1000 delay-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-terra-amber/20 flex items-center justify-center flex-shrink-0">
              <Truck size={24} className="text-terra-amber" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-terra-amber mb-2">🔍 Hidden Discovery: Ghost Cycle Detection</h3>
              <p className="text-slate-300 text-sm mb-3">
                TERRA identified equipment that appears "active" but is actually wasting fuel. By correlating 
                <strong className="text-white"> GPS breadcrumbs</strong> with <strong className="text-white">engine load telematics</strong>,
                we detected trucks moving but not hauling payload.
              </p>
              <p className="text-slate-400 text-sm">
                Impact: <strong className="text-terra-amber">20% fuel waste</strong> identified • 
                Root cause: Site layout inefficiency • 
                Savings potential: <strong className="text-white">$50K/month</strong>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-navy-700/50 py-6">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm text-slate-500">
            Built on <span className="text-terra-amber">Snowflake</span> • Cortex AI • Cortex Agents • SPCS
          </p>
        </div>
      </div>
    </div>
  )
}
