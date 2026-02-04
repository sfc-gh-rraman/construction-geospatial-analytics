import { useState, useEffect } from 'react'
import { Brain, BarChart3, TrendingUp, Target, CheckCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts'

interface FeatureImportance {
  feature: string
  importance: number
  direction: 'positive' | 'negative' | 'mixed'
}

interface ModelMetric {
  name: string
  value: number
}

interface Model {
  name: string
  displayName: string
  type: 'classification' | 'regression'
  description: string
  features: FeatureImportance[]
  metrics: ModelMetric[]
}

export function MLExplainability() {
  const [selectedModel, setSelectedModel] = useState<string>('GHOST_CYCLE_DETECTOR')
  const [models] = useState<Model[]>([
    {
      name: 'GHOST_CYCLE_DETECTOR',
      displayName: 'Ghost Cycle Detector',
      type: 'classification',
      description: 'Identifies equipment moving without productive work (GPS speed vs engine load correlation)',
      features: [
        { feature: 'SPEED_TO_LOAD_RATIO', importance: 0.42, direction: 'positive' },
        { feature: 'ENGINE_LOAD_PERCENT', importance: 0.28, direction: 'negative' },
        { feature: 'SPEED_MPH', importance: 0.15, direction: 'positive' },
        { feature: 'ENGINE_LOAD_ROLLING_STD', importance: 0.08, direction: 'mixed' },
        { feature: 'FUEL_RATE_GPH', importance: 0.07, direction: 'mixed' },
      ],
      metrics: [
        { name: 'Accuracy', value: 0.92 },
        { name: 'Precision', value: 0.88 },
        { name: 'Recall', value: 0.95 },
        { name: 'F1 Score', value: 0.91 },
        { name: 'AUC', value: 0.96 },
      ]
    },
    {
      name: 'CYCLE_TIME_OPTIMIZER',
      displayName: 'Cycle Time Optimizer',
      type: 'regression',
      description: 'Predicts and optimizes haul cycle times based on operational factors',
      features: [
        { feature: 'HAUL_DISTANCE_MILES', importance: 0.35, direction: 'positive' },
        { feature: 'LOAD_VOLUME_YD3', importance: 0.22, direction: 'positive' },
        { feature: 'IS_PEAK_HOUR', importance: 0.18, direction: 'positive' },
        { feature: 'HOUR_OF_DAY', importance: 0.15, direction: 'mixed' },
        { feature: 'FUEL_EFFICIENCY', importance: 0.10, direction: 'negative' },
      ],
      metrics: [
        { name: 'R² Score', value: 0.85 },
        { name: 'RMSE', value: 3.2 },
        { name: 'MAE', value: 2.4 },
      ]
    },
    {
      name: 'CHOKE_POINT_PREDICTOR',
      displayName: 'Choke Point Predictor',
      type: 'classification',
      description: 'Predicts traffic bottlenecks on haul roads based on traffic density patterns',
      features: [
        { feature: 'TRAFFIC_DENSITY', importance: 0.38, direction: 'positive' },
        { feature: 'AVG_SPEED', importance: 0.25, direction: 'negative' },
        { feature: 'UNIQUE_EQUIPMENT', importance: 0.18, direction: 'positive' },
        { feature: 'SPEED_TREND', importance: 0.12, direction: 'negative' },
        { feature: 'IS_PEAK_HOUR', importance: 0.07, direction: 'positive' },
      ],
      metrics: [
        { name: 'Accuracy', value: 0.89 },
        { name: 'Precision', value: 0.85 },
        { name: 'Recall', value: 0.92 },
        { name: 'F1 Score', value: 0.88 },
        { name: 'Calibration Error', value: 0.03 },
      ]
    },
  ])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
const [_loading, setLoading] = useState(false)

  const currentModel = models.find(m => m.name === selectedModel)

  // Simulate API fetch for feature importance
  useEffect(() => {
    const fetchModelData = async () => {
      setLoading(true)
      try {
        // In production, fetch from API
        // const response = await fetch(`${API_BASE}/api/ml/feature-importance/${selectedModel}`)
        // const data = await response.json()
        await new Promise(resolve => setTimeout(resolve, 300)) // Simulate loading
      } catch (error) {
        console.error('Failed to fetch model data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchModelData()
  }, [selectedModel])

  const getDirectionColor = (direction: string) => {
    switch (direction) {
      case 'positive': return 'text-red-400'
      case 'negative': return 'text-emerald-400'
      default: return 'text-stone-400'
    }
  }

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'positive': return '↑ increases risk'
      case 'negative': return '↓ decreases risk'
      default: return '↔ varies'
    }
  }

  const chartData = currentModel?.features.map(f => ({
    name: f.feature.replace(/_/g, ' '),
    importance: f.importance * 100,
  })) || []

  // Generate sample PDP data for visualization
  const pdpData = Array.from({ length: 20 }, (_, i) => ({
    value: i * 5,
    prediction: 20 + Math.sin(i / 3) * 5 + i * 0.3,
    lower: 15 + Math.sin(i / 3) * 4 + i * 0.2,
    upper: 25 + Math.sin(i / 3) * 6 + i * 0.4,
  }))

  return (
    <div className="h-screen flex flex-col animated-grid-bg">
      {/* Header */}
      <header className="bg-earth-800/80 backdrop-blur border-b border-earth-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-display font-semibold text-stone-200">ML Model Explainability</h1>
            <p className="text-sm text-stone-400">SHAP analysis, feature importance, and model performance</p>
          </div>
          <div className="flex items-center gap-2">
            <Brain size={20} className="text-accent-amber" />
            <span className="text-sm text-stone-400">3 Active Models</span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {/* Model Selector */}
        <div className="flex gap-4 mb-6">
          {models.map((model) => (
            <button
              key={model.name}
              onClick={() => setSelectedModel(model.name)}
              className={`card card-hover p-4 flex-1 text-left transition-all ${
                selectedModel === model.name ? 'border-accent-amber/50 card-glow' : ''
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Brain size={20} className={selectedModel === model.name ? 'text-accent-amber' : 'text-stone-500'} />
                <span className={`text-sm font-medium ${selectedModel === model.name ? 'text-stone-200' : 'text-stone-400'}`}>
                  {model.displayName}
                </span>
              </div>
              <p className="text-xs text-stone-500">{model.type}</p>
            </button>
          ))}
        </div>

        {currentModel && (
          <div className="grid grid-cols-3 gap-6">
            {/* Feature Importance */}
            <div className="col-span-2 card p-6">
              <h2 className="text-lg font-semibold text-stone-200 mb-2 flex items-center gap-2">
                <BarChart3 size={20} className="text-accent-amber" />
                Feature Importance (SHAP)
              </h2>
              <p className="text-sm text-stone-500 mb-6">{currentModel.description}</p>
              
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 120 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3d352e" />
                    <XAxis type="number" stroke="#6b5f54" fontSize={12} />
                    <YAxis type="category" dataKey="name" stroke="#6b5f54" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#292420', border: '1px solid #3d352e', borderRadius: '8px' }}
                      labelStyle={{ color: '#a8a29e' }}
                    />
                    <Bar dataKey="importance" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Feature Details */}
              <div className="mt-6 space-y-2">
                {currentModel.features.map((feature, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-earth-700/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-stone-500 w-4">{i + 1}</span>
                      <span className="font-mono text-sm text-stone-300">{feature.feature}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-sm text-accent-amber">{(feature.importance * 100).toFixed(1)}%</span>
                      <span className={`text-xs ${getDirectionColor(feature.direction)}`}>
                        {getDirectionIcon(feature.direction)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Model Metrics */}
            <div className="space-y-6">
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-stone-200 mb-4 flex items-center gap-2">
                  <Target size={20} className="text-accent-emerald" />
                  Model Performance
                </h2>
                <div className="space-y-4">
                  {currentModel.metrics.map((metric, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-stone-400">{metric.name}</span>
                        <span className="font-mono text-sm text-stone-200">
                          {metric.value < 1 ? (metric.value * 100).toFixed(1) + '%' : metric.value.toFixed(2)}
                        </span>
                      </div>
                      {metric.name !== 'RMSE' && metric.name !== 'MAE' && metric.name !== 'Calibration Error' && (
                        <div className="w-full h-2 bg-earth-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-accent-amber to-accent-emerald rounded-full transition-all duration-500"
                            style={{ width: `${metric.value * 100}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Model Status */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-stone-200 mb-4 flex items-center gap-2">
                  <CheckCircle size={20} className="text-accent-emerald" />
                  Model Status
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-stone-400">Version</span>
                    <span className="font-mono text-sm text-stone-300">v1.0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-stone-400">Last Trained</span>
                    <span className="text-sm text-stone-300">2 days ago</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-stone-400">Training Samples</span>
                    <span className="font-mono text-sm text-stone-300">50,000</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-stone-400">Status</span>
                    <span className="px-2 py-0.5 bg-accent-emerald/20 text-accent-emerald text-xs rounded-full">
                      Production
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Partial Dependence Plot */}
            <div className="col-span-3 card p-6">
              <h2 className="text-lg font-semibold text-stone-200 mb-2 flex items-center gap-2">
                <TrendingUp size={20} className="text-accent-cyan" />
                Partial Dependence: {currentModel.features[0]?.feature.replace(/_/g, ' ')}
              </h2>
              <p className="text-sm text-stone-500 mb-6">
                Shows how changes in this feature affect the model's prediction while holding other features constant
              </p>
              
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={pdpData} margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3d352e" />
                    <XAxis dataKey="value" stroke="#6b5f54" fontSize={12} />
                    <YAxis stroke="#6b5f54" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#292420', border: '1px solid #3d352e', borderRadius: '8px' }}
                      labelStyle={{ color: '#a8a29e' }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="prediction" 
                      stroke="#06b6d4" 
                      strokeWidth={2}
                      dot={false}
                      name="Predicted Value"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="upper" 
                      stroke="#06b6d4" 
                      strokeWidth={1}
                      strokeDasharray="5 5"
                      dot={false}
                      name="90th Percentile"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="lower" 
                      stroke="#06b6d4" 
                      strokeWidth={1}
                      strokeDasharray="5 5"
                      dot={false}
                      name="10th Percentile"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
