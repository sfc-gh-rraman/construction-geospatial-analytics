import { Database, Brain, Cpu, Cloud, GitBranch, Server, Layers, Zap, Search, BarChart3, MessageSquare } from 'lucide-react'

export function Architecture() {
  const dataLayers = [
    { name: 'RAW', description: 'GPS breadcrumbs, telematics, cycle events', icon: Database },
    { name: 'ATOMIC', description: 'Cleansed and standardized records', icon: Layers },
    { name: 'CONSTRUCTION_GEO', description: 'Analytics-ready aggregations and marts', icon: BarChart3 },
    { name: 'ML', description: 'Model explainability and predictions', icon: Brain },
  ]

  const agents = [
    { 
      name: 'Watchdog Agent', 
      description: 'Real-time monitoring for Ghost Cycles and Choke Points',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30'
    },
    { 
      name: 'Route Advisor Agent', 
      description: 'Optimal routing and cycle time predictions',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/30'
    },
    { 
      name: 'Historian Agent', 
      description: 'Document search and historical analysis',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30'
    },
  ]

  const mlModels = [
    { name: 'Ghost Cycle Detector', type: 'XGBoost Classifier', accuracy: '92%' },
    { name: 'Cycle Time Optimizer', type: 'Gradient Boosting', r2: '0.85' },
    { name: 'Choke Point Predictor', type: 'Random Forest', accuracy: '89%' },
  ]

  return (
    <div className="h-screen flex flex-col animated-grid-bg">
      {/* Header */}
      <header className="bg-earth-800/80 backdrop-blur border-b border-earth-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-display font-semibold text-stone-200">System Architecture</h1>
            <p className="text-sm text-stone-400">GroundTruth Construction Co-Pilot technical overview</p>
          </div>
          <div className="flex items-center gap-2">
            <GitBranch size={20} className="text-accent-amber" />
            <span className="text-sm text-stone-400">v1.0.0</span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Architecture Overview */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-stone-200 mb-6 flex items-center gap-2">
              <Cloud size={20} className="text-accent-amber" />
              Architecture Overview
            </h2>
            
            <div className="grid grid-cols-4 gap-4">
              {/* Frontend */}
              <div className="card p-4 border-accent-cyan/30">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare size={18} className="text-accent-cyan" />
                  <span className="font-medium text-stone-200">Frontend</span>
                </div>
                <ul className="text-xs text-stone-400 space-y-1">
                  <li>• React + TypeScript</li>
                  <li>• Vite + Tailwind CSS</li>
                  <li>• Real-time WebSocket</li>
                  <li>• Recharts visualization</li>
                </ul>
              </div>

              {/* Backend */}
              <div className="card p-4 border-accent-amber/30">
                <div className="flex items-center gap-2 mb-3">
                  <Server size={18} className="text-accent-amber" />
                  <span className="font-medium text-stone-200">Backend</span>
                </div>
                <ul className="text-xs text-stone-400 space-y-1">
                  <li>• FastAPI (Python)</li>
                  <li>• Multi-agent orchestration</li>
                  <li>• Snowpark integration</li>
                  <li>• OAuth token auth</li>
                </ul>
              </div>

              {/* Cortex AI */}
              <div className="card p-4 border-purple-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <Brain size={18} className="text-purple-400" />
                  <span className="font-medium text-stone-200">Cortex AI</span>
                </div>
                <ul className="text-xs text-stone-400 space-y-1">
                  <li>• Cortex Analyst (SQL)</li>
                  <li>• Cortex Search (RAG)</li>
                  <li>• Cortex LLM (reasoning)</li>
                  <li>• ML Model Registry</li>
                </ul>
              </div>

              {/* Data Platform */}
              <div className="card p-4 border-accent-emerald/30">
                <div className="flex items-center gap-2 mb-3">
                  <Database size={18} className="text-accent-emerald" />
                  <span className="font-medium text-stone-200">Snowflake</span>
                </div>
                <ul className="text-xs text-stone-400 space-y-1">
                  <li>• CONSTRUCTION_GEO_DB</li>
                  <li>• Snowpark Container Services</li>
                  <li>• Time Travel & Cloning</li>
                  <li>• Native ML Functions</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Data Layer */}
          <div className="grid grid-cols-2 gap-6">
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-stone-200 mb-4 flex items-center gap-2">
                <Layers size={20} className="text-accent-emerald" />
                Data Architecture
              </h2>
              <div className="space-y-3">
                {dataLayers.map((layer, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 bg-earth-700/30 rounded-lg">
                    <div className="w-10 h-10 rounded-lg bg-accent-emerald/10 flex items-center justify-center">
                      <layer.icon size={18} className="text-accent-emerald" />
                    </div>
                    <div>
                      <p className="font-mono text-sm text-stone-200">{layer.name}</p>
                      <p className="text-xs text-stone-500">{layer.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Agent System */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-stone-200 mb-4 flex items-center gap-2">
                <Cpu size={20} className="text-accent-amber" />
                Agent System
              </h2>
              <div className="space-y-3">
                {/* Orchestrator */}
                <div className="p-4 bg-accent-amber/10 border border-accent-amber/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={16} className="text-accent-amber" />
                    <span className="font-medium text-stone-200">Orchestrator</span>
                  </div>
                  <p className="text-xs text-stone-400">Intent classification and agent routing</p>
                </div>
                
                {/* Agents */}
                {agents.map((agent, i) => (
                  <div key={i} className={`p-3 ${agent.bgColor} border ${agent.borderColor} rounded-lg`}>
                    <p className={`font-medium text-sm ${agent.color}`}>{agent.name}</p>
                    <p className="text-xs text-stone-500">{agent.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ML Models */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-stone-200 mb-4 flex items-center gap-2">
              <Brain size={20} className="text-purple-400" />
              ML Models
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {mlModels.map((model, i) => (
                <div key={i} className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                  <h3 className="font-medium text-stone-200 mb-1">{model.name}</h3>
                  <p className="text-xs text-stone-500 mb-3">{model.type}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-500">{model.accuracy ? 'Accuracy' : 'R² Score'}</span>
                    <span className="font-mono text-sm text-purple-400">{model.accuracy || model.r2}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Discovery Flow */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-stone-200 mb-4 flex items-center gap-2">
              <Search size={20} className="text-accent-cyan" />
              Hidden Discovery: Ghost Cycles
            </h2>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 bg-earth-700/30 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-accent-amber/10 flex items-center justify-center mx-auto mb-2">
                  <Database size={20} className="text-accent-amber" />
                </div>
                <p className="text-sm font-medium text-stone-300">1. GPS + Telematics</p>
                <p className="text-xs text-stone-500 mt-1">Speed, engine load, fuel rate streaming</p>
              </div>
              
              <div className="text-center p-4 bg-earth-700/30 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-accent-amber/10 flex items-center justify-center mx-auto mb-2">
                  <Brain size={20} className="text-accent-amber" />
                </div>
                <p className="text-sm font-medium text-stone-300">2. ML Detection</p>
                <p className="text-xs text-stone-500 mt-1">XGBoost identifies speed/load anomalies</p>
              </div>
              
              <div className="text-center p-4 bg-earth-700/30 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-2">
                  <Zap size={20} className="text-orange-400" />
                </div>
                <p className="text-sm font-medium text-stone-300">3. Ghost Cycle Alert</p>
                <p className="text-xs text-stone-500 mt-1">Moving without productive work detected</p>
              </div>
              
              <div className="text-center p-4 bg-earth-700/30 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-accent-emerald/10 flex items-center justify-center mx-auto mb-2">
                  <BarChart3 size={20} className="text-accent-emerald" />
                </div>
                <p className="text-sm font-medium text-stone-300">4. Fuel Savings</p>
                <p className="text-xs text-stone-500 mt-1">Actionable insight: reassign equipment</p>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-orange-500/5 border border-orange-500/20 rounded-lg">
              <p className="text-sm text-stone-300">
                <span className="font-semibold text-orange-400">💡 Discovery:</span> Ghost Cycles represent equipment 
                that appears active but is actually idling or taking inefficient routes. By correlating GPS speed 
                with engine load, we uncover hidden fuel waste invisible to traditional monitoring.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
