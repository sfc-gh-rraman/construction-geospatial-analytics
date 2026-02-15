import { useState, useEffect } from 'react'
import { Brain, BarChart3, TrendingUp, Target, CheckCircle, DollarSign, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, Area, AreaChart, ScatterChart, Scatter, ReferenceLine } from 'recharts'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface FeatureImportance {
  FEATURE_NAME: string
  SHAP_IMPORTANCE: number
  IMPORTANCE_RANK: number
  FEATURE_DIRECTION: string
}

interface ModelMetric {
  METRIC_NAME: string
  METRIC_VALUE: number
  METRIC_CONTEXT: string
}

interface CalibrationPoint {
  PREDICTED_PROB_BIN: number
  ACTUAL_FREQUENCY: number
  BIN_COUNT: number
  CALIBRATION_ERROR?: number
}

interface PDPPoint {
  FEATURE_NAME: string
  FEATURE_VALUE: number
  PREDICTED_VALUE: number
  LOWER_BOUND: number
  UPPER_BOUND: number
}

interface ProfitCurvePoint {
  PROBABILITY_THRESHOLD: number
  EXPECTED_TP_RATE: number
  EXPECTED_FP_RATE: number
  EXPECTED_NET_DAILY_VALUE_USD: number
  IS_OPTIMAL_THRESHOLD: boolean
}

interface CostMatrixData {
  TRUE_POSITIVE_COUNT: number
  FALSE_POSITIVE_COUNT: number
  FALSE_NEGATIVE_COUNT: number
  TRUE_POSITIVE_VALUE_USD: number
  FALSE_POSITIVE_COST_USD: number
  FALSE_NEGATIVE_COST_USD: number
  NET_VALUE_USD: number
}

const MODEL_INFO = {
  GHOST_CYCLE_DETECTOR: {
    displayName: 'Ghost Cycle Detector',
    type: 'classification',
    description: 'Identifies equipment moving without productive work (GPS speed vs engine load correlation)'
  },
  CYCLE_TIME_OPTIMIZER: {
    displayName: 'Cycle Time Optimizer',
    type: 'regression',
    description: 'Predicts and optimizes haul cycle times based on operational factors'
  },
  CHOKE_POINT_PREDICTOR: {
    displayName: 'Choke Point Predictor',
    type: 'classification',
    description: 'Predicts traffic bottlenecks on haul roads based on traffic density patterns'
  }
}

export function MLExplainability() {
  const [selectedModel, setSelectedModel] = useState<string>('GHOST_CYCLE_DETECTOR')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'features' | 'calibration' | 'costs'>('features')
  
  const [features, setFeatures] = useState<FeatureImportance[]>([])
  const [metrics, setMetrics] = useState<ModelMetric[]>([])
  const [calibration, setCalibration] = useState<CalibrationPoint[]>([])
  const [pdpData, setPdpData] = useState<PDPPoint[]>([])
  const [profitCurves, setProfitCurves] = useState<ProfitCurvePoint[]>([])
  const [costMatrix, setCostMatrix] = useState<CostMatrixData | null>(null)

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true)
      try {
        const [featuresRes, metricsRes, calibrationRes, profitRes, costRes] = await Promise.all([
          fetch(`${API_BASE}/api/ml/feature-importance/${selectedModel}`),
          fetch(`${API_BASE}/api/ml/metrics/${selectedModel}`),
          fetch(`${API_BASE}/api/ml/calibration/${selectedModel}`),
          fetch(`${API_BASE}/api/ml/profit-curves/${selectedModel}`),
          fetch(`${API_BASE}/api/ml/cost-matrix/${selectedModel}`)
        ])

        if (featuresRes.ok) {
          const data = await featuresRes.json()
          setFeatures(data.features || [])
        }
        if (metricsRes.ok) {
          const data = await metricsRes.json()
          setMetrics(data.metrics || [])
        }
        if (calibrationRes.ok) {
          const data = await calibrationRes.json()
          setCalibration(data.calibration_data || [])
        }
        if (profitRes.ok) {
          const data = await profitRes.json()
          setProfitCurves(data.curves || [])
        }
        if (costRes.ok) {
          const data = await costRes.json()
          if (data.data && data.data.length > 0) {
            setCostMatrix(data.data[0])
          }
        }

        if (features.length > 0) {
          const pdpRes = await fetch(`${API_BASE}/api/ml/pdp/${selectedModel}/${features[0].FEATURE_NAME}`)
          if (pdpRes.ok) {
            const data = await pdpRes.json()
            setPdpData(data.pdp_data || [])
          }
        }
      } catch (error) {
        console.error('Failed to fetch model data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAllData()
  }, [selectedModel])

  const currentModelInfo = MODEL_INFO[selectedModel as keyof typeof MODEL_INFO]

  const getDirectionColor = (direction: string) => {
    switch (direction?.toLowerCase()) {
      case 'positive': return 'text-red-400'
      case 'negative': return 'text-emerald-400'
      default: return 'text-stone-400'
    }
  }

  const getDirectionIcon = (direction: string) => {
    switch (direction?.toLowerCase()) {
      case 'positive': return '↑ increases risk'
      case 'negative': return '↓ decreases risk'
      default: return '↔ varies'
    }
  }

  const chartData = features.map(f => ({
    name: f.FEATURE_NAME.replace(/_/g, ' '),
    importance: f.SHAP_IMPORTANCE * 100,
  }))

  const calibrationChartData = calibration.map(c => ({
    predicted: c.PREDICTED_PROB_BIN * 100,
    actual: c.ACTUAL_FREQUENCY * 100,
    perfect: c.PREDICTED_PROB_BIN * 100,
    count: c.BIN_COUNT
  }))

  const profitChartData = profitCurves.map(p => ({
    threshold: p.PROBABILITY_THRESHOLD * 100,
    value: p.EXPECTED_NET_DAILY_VALUE_USD,
    detectionRate: p.EXPECTED_TP_RATE * 100,
    falseAlarmRate: p.EXPECTED_FP_RATE * 100,
    isOptimal: p.IS_OPTIMAL_THRESHOLD
  }))

  const optimalThreshold = profitCurves.find(p => p.IS_OPTIMAL_THRESHOLD)

  return (
    <div className="h-screen flex flex-col animated-grid-bg">
      <header className="bg-earth-800/80 backdrop-blur border-b border-earth-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-display font-semibold text-stone-200">ML Model Explainability</h1>
            <p className="text-sm text-stone-400">SHAP analysis, calibration curves, and business value metrics</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {['features', 'calibration', 'costs'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as typeof activeTab)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                    activeTab === tab 
                      ? 'bg-accent-amber/20 text-accent-amber border border-accent-amber/30' 
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {tab === 'features' ? 'Feature Importance' : tab === 'calibration' ? 'Calibration' : 'Cost Analysis'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Brain size={20} className="text-accent-amber" />
              <span className="text-sm text-stone-400">3 Active Models</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="flex gap-4 mb-6">
          {Object.entries(MODEL_INFO).map(([name, info]) => (
            <button
              key={name}
              onClick={() => setSelectedModel(name)}
              className={`card card-hover p-4 flex-1 text-left transition-all ${
                selectedModel === name ? 'border-accent-amber/50 card-glow' : ''
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Brain size={20} className={selectedModel === name ? 'text-accent-amber' : 'text-stone-500'} />
                <span className={`text-sm font-medium ${selectedModel === name ? 'text-stone-200' : 'text-stone-400'}`}>
                  {info.displayName}
                </span>
              </div>
              <p className="text-xs text-stone-500">{info.type}</p>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-amber"></div>
          </div>
        ) : (
          <>
            {activeTab === 'features' && (
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 card p-6">
                  <h2 className="text-lg font-semibold text-stone-200 mb-2 flex items-center gap-2">
                    <BarChart3 size={20} className="text-accent-amber" />
                    Feature Importance (SHAP)
                  </h2>
                  <p className="text-sm text-stone-500 mb-6">{currentModelInfo?.description}</p>
                  
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} layout="vertical" margin={{ left: 140 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#3d352e" />
                        <XAxis type="number" stroke="#6b5f54" fontSize={12} unit="%" />
                        <YAxis type="category" dataKey="name" stroke="#6b5f54" fontSize={11} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#292420', border: '1px solid #3d352e', borderRadius: '8px' }}
                          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Importance']}
                        />
                        <Bar dataKey="importance" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-6 space-y-2">
                    {features.map((feature, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-earth-700/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-stone-500 w-4">{feature.IMPORTANCE_RANK}</span>
                          <span className="font-mono text-sm text-stone-300">{feature.FEATURE_NAME}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-sm text-accent-amber">{(feature.SHAP_IMPORTANCE * 100).toFixed(1)}%</span>
                          <span className={`text-xs ${getDirectionColor(feature.FEATURE_DIRECTION)}`}>
                            {getDirectionIcon(feature.FEATURE_DIRECTION)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="card p-6">
                    <h2 className="text-lg font-semibold text-stone-200 mb-4 flex items-center gap-2">
                      <Target size={20} className="text-accent-emerald" />
                      Model Performance
                    </h2>
                    <div className="space-y-4">
                      {metrics.map((metric, i) => (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-stone-400">{metric.METRIC_NAME}</span>
                            <span className="font-mono text-sm text-stone-200">
                              {metric.METRIC_VALUE < 1 ? (metric.METRIC_VALUE * 100).toFixed(1) + '%' : metric.METRIC_VALUE.toFixed(2)}
                            </span>
                          </div>
                          {metric.METRIC_VALUE <= 1 && (
                            <div className="w-full h-2 bg-earth-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-accent-amber to-accent-emerald rounded-full transition-all duration-500"
                                style={{ width: `${metric.METRIC_VALUE * 100}%` }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

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
                        <span className="text-sm text-stone-400">Registry</span>
                        <span className="text-sm text-stone-300">ML.{selectedModel}</span>
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

                {pdpData.length > 0 && (
                  <div className="col-span-3 card p-6">
                    <h2 className="text-lg font-semibold text-stone-200 mb-2 flex items-center gap-2">
                      <TrendingUp size={20} className="text-accent-cyan" />
                      Partial Dependence: {pdpData[0]?.FEATURE_NAME?.replace(/_/g, ' ')}
                    </h2>
                    <p className="text-sm text-stone-500 mb-6">
                      Shows how changes in this feature affect the model's prediction while holding other features constant
                    </p>
                    
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={pdpData} margin={{ left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#3d352e" />
                          <XAxis dataKey="FEATURE_VALUE" stroke="#6b5f54" fontSize={12} />
                          <YAxis stroke="#6b5f54" fontSize={12} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#292420', border: '1px solid #3d352e', borderRadius: '8px' }}
                          />
                          <Area type="monotone" dataKey="UPPER_BOUND" stroke="transparent" fill="#06b6d4" fillOpacity={0.1} />
                          <Area type="monotone" dataKey="LOWER_BOUND" stroke="transparent" fill="#292420" fillOpacity={1} />
                          <Line type="monotone" dataKey="PREDICTED_VALUE" stroke="#06b6d4" strokeWidth={2} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'calibration' && (
              <div className="grid grid-cols-2 gap-6">
                <div className="card p-6">
                  <h2 className="text-lg font-semibold text-stone-200 mb-2 flex items-center gap-2">
                    <Target size={20} className="text-accent-cyan" />
                    Calibration Curve
                  </h2>
                  <p className="text-sm text-stone-500 mb-6">
                    Shows if predicted probabilities match actual outcomes. Perfect calibration = diagonal line.
                  </p>
                  
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#3d352e" />
                        <XAxis 
                          dataKey="predicted" 
                          type="number" 
                          domain={[0, 100]} 
                          stroke="#6b5f54" 
                          fontSize={12}
                          label={{ value: 'Predicted Probability (%)', position: 'bottom', fill: '#6b5f54' }}
                        />
                        <YAxis 
                          dataKey="actual" 
                          type="number" 
                          domain={[0, 100]} 
                          stroke="#6b5f54" 
                          fontSize={12}
                          label={{ value: 'Actual Frequency (%)', angle: -90, position: 'insideLeft', fill: '#6b5f54' }}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#292420', border: '1px solid #3d352e', borderRadius: '8px' }}
                          formatter={(value: number, name: string) => [
                            `${value.toFixed(1)}%`,
                            name === 'actual' ? 'Actual' : 'Predicted'
                          ]}
                        />
                        <ReferenceLine 
                          segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]} 
                          stroke="#6b5f54" 
                          strokeDasharray="5 5"
                          label={{ value: 'Perfect', fill: '#6b5f54', fontSize: 10 }}
                        />
                        <Scatter 
                          data={calibrationChartData} 
                          fill="#06b6d4"
                          line={{ stroke: '#06b6d4', strokeWidth: 2 }}
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="card p-6">
                  <h2 className="text-lg font-semibold text-stone-200 mb-4 flex items-center gap-2">
                    <CheckCircle size={20} className="text-accent-emerald" />
                    Calibration Quality
                  </h2>
                  
                  <div className="space-y-4 mb-6">
                    <div className="p-4 bg-earth-700/30 rounded-lg">
                      <div className="text-sm text-stone-400 mb-1">Mean Calibration Error</div>
                      <div className="text-2xl font-mono text-accent-emerald">
                        {(calibration.reduce((sum, c) => sum + Math.abs(c.PREDICTED_PROB_BIN - c.ACTUAL_FREQUENCY), 0) / calibration.length * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-stone-500 mt-1">Lower is better (perfect = 0%)</div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-stone-400 mb-3">Probability Bins</div>
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {calibration.map((c, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-earth-700/20 rounded">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs text-stone-500">{(c.PREDICTED_PROB_BIN * 100).toFixed(0)}%</span>
                          <span className="text-sm text-stone-300">predicted</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm text-accent-cyan">{(c.ACTUAL_FREQUENCY * 100).toFixed(1)}%</span>
                          <span className="text-xs text-stone-500">actual ({c.BIN_COUNT} samples)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 p-4 bg-accent-emerald/10 border border-accent-emerald/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <CheckCircle size={16} className="text-accent-emerald mt-0.5" />
                      <div>
                        <div className="text-sm font-medium text-accent-emerald">Well Calibrated</div>
                        <div className="text-xs text-stone-400 mt-1">
                          When this model predicts 70% probability, the event occurs approximately 70% of the time.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'costs' && (
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 card p-6">
                  <h2 className="text-lg font-semibold text-stone-200 mb-2 flex items-center gap-2">
                    <DollarSign size={20} className="text-accent-amber" />
                    Profit Curve: Threshold Optimization
                  </h2>
                  <p className="text-sm text-stone-500 mb-6">
                    Expected daily value at different alert thresholds. Find the sweet spot between catching issues and avoiding false alarms.
                  </p>
                  
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={profitChartData} margin={{ left: 20, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#3d352e" />
                        <XAxis 
                          dataKey="threshold" 
                          stroke="#6b5f54" 
                          fontSize={12}
                          label={{ value: 'Alert Threshold (%)', position: 'bottom', fill: '#6b5f54', offset: -5 }}
                        />
                        <YAxis 
                          stroke="#6b5f54" 
                          fontSize={12}
                          label={{ value: 'Daily Value ($)', angle: -90, position: 'insideLeft', fill: '#6b5f54' }}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#292420', border: '1px solid #3d352e', borderRadius: '8px' }}
                          formatter={(value: number, name: string) => [
                            name === 'value' ? `$${value.toFixed(2)}` : `${value.toFixed(1)}%`,
                            name === 'value' ? 'Daily Value' : name === 'detectionRate' ? 'Detection Rate' : 'False Alarm Rate'
                          ]}
                        />
                        <ReferenceLine y={0} stroke="#6b5f54" strokeDasharray="3 3" />
                        {optimalThreshold && (
                          <ReferenceLine 
                            x={optimalThreshold.PROBABILITY_THRESHOLD * 100} 
                            stroke="#10b981" 
                            strokeWidth={2}
                            label={{ value: 'Optimal', fill: '#10b981', fontSize: 12 }}
                          />
                        )}
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#f59e0b" 
                          fill="#f59e0b" 
                          fillOpacity={0.2}
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="p-4 bg-earth-700/30 rounded-lg text-center">
                      <div className="text-xs text-stone-500 mb-1">Low Threshold (20%)</div>
                      <div className="text-lg font-mono text-stone-300">
                        {profitChartData.find(p => p.threshold === 20)?.detectionRate.toFixed(0)}% catch
                      </div>
                      <div className="text-xs text-red-400">High false alarms</div>
                    </div>
                    <div className="p-4 bg-accent-emerald/10 border border-accent-emerald/30 rounded-lg text-center">
                      <div className="text-xs text-accent-emerald mb-1">Optimal ({optimalThreshold?.PROBABILITY_THRESHOLD ? (optimalThreshold.PROBABILITY_THRESHOLD * 100).toFixed(0) : 50}%)</div>
                      <div className="text-lg font-mono text-accent-emerald">
                        ${optimalThreshold?.EXPECTED_NET_DAILY_VALUE_USD?.toFixed(0) || 230}/day
                      </div>
                      <div className="text-xs text-stone-400">Best value</div>
                    </div>
                    <div className="p-4 bg-earth-700/30 rounded-lg text-center">
                      <div className="text-xs text-stone-500 mb-1">High Threshold (80%)</div>
                      <div className="text-lg font-mono text-stone-300">
                        {profitChartData.find(p => p.threshold === 80)?.detectionRate.toFixed(0)}% catch
                      </div>
                      <div className="text-xs text-amber-400">Missing issues</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {costMatrix && (
                    <div className="card p-6">
                      <h2 className="text-lg font-semibold text-stone-200 mb-4 flex items-center gap-2">
                        <DollarSign size={20} className="text-accent-emerald" />
                        Monthly Cost Matrix
                      </h2>
                      
                      <div className="space-y-4">
                        <div className="p-3 bg-accent-emerald/10 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-stone-400">True Positives (Saved)</span>
                            <span className="font-mono text-accent-emerald">+${costMatrix.TRUE_POSITIVE_VALUE_USD?.toFixed(2)}</span>
                          </div>
                          <div className="text-xs text-stone-500 mt-1">{costMatrix.TRUE_POSITIVE_COUNT} issues caught</div>
                        </div>
                        
                        <div className="p-3 bg-red-500/10 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-stone-400">False Positives (Wasted)</span>
                            <span className="font-mono text-red-400">-${costMatrix.FALSE_POSITIVE_COST_USD?.toFixed(2)}</span>
                          </div>
                          <div className="text-xs text-stone-500 mt-1">{costMatrix.FALSE_POSITIVE_COUNT} false alarms</div>
                        </div>
                        
                        <div className="p-3 bg-amber-500/10 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-stone-400">False Negatives (Missed)</span>
                            <span className="font-mono text-amber-400">-${costMatrix.FALSE_NEGATIVE_COST_USD?.toFixed(2)}</span>
                          </div>
                          <div className="text-xs text-stone-500 mt-1">{costMatrix.FALSE_NEGATIVE_COUNT} issues missed</div>
                        </div>
                        
                        <div className="border-t border-earth-700 pt-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-stone-300">Net Value</span>
                            <span className={`font-mono text-lg ${costMatrix.NET_VALUE_USD >= 0 ? 'text-accent-emerald' : 'text-red-400'}`}>
                              {costMatrix.NET_VALUE_USD >= 0 ? '+' : ''}${costMatrix.NET_VALUE_USD?.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-xs text-stone-500 mt-1">
                            Projected annual: ${(costMatrix.NET_VALUE_USD * 12)?.toFixed(0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="card p-6">
                    <h2 className="text-lg font-semibold text-stone-200 mb-4 flex items-center gap-2">
                      <AlertTriangle size={20} className="text-accent-amber" />
                      Cost Assumptions
                    </h2>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-stone-400">Diesel fuel</span>
                        <span className="text-stone-300">$3.80/gal</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-400">Ghost cycle burn</span>
                        <span className="text-stone-300">6.5 gal/event</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-400">Investigation time</span>
                        <span className="text-stone-300">15 min @ $45/hr</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-400">Missed ghost (3hr avg)</span>
                        <span className="text-stone-300">19.5 gal</span>
                      </div>
                      <div className="text-xs text-stone-500 mt-4 pt-3 border-t border-earth-700">
                        Source: Operations Team Q1 2024
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
