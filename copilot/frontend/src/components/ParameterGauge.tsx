import { ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface ParameterGaugeProps {
  label: string
  value: number
  unit: string
  min: number
  max: number
  optimal?: { low: number; high: number }
  trend?: 'up' | 'down' | 'stable'
  icon?: ReactNode
  format?: (value: number) => string
}

export function ParameterGauge({
  label,
  value,
  unit,
  min,
  max,
  optimal,
  trend,
  icon,
  format = (v) => v.toFixed(1),
}: ParameterGaugeProps) {
  const percentage = ((value - min) / (max - min)) * 100
  const clampedPercentage = Math.max(0, Math.min(100, percentage))

  // Determine color based on optimal range
  let barColor = 'bg-accent-amber'
  let textColor = 'text-accent-amber'
  
  if (optimal) {
    if (value >= optimal.low && value <= optimal.high) {
      barColor = 'bg-accent-green'
      textColor = 'text-accent-green'
    } else if (value < optimal.low * 0.8 || value > optimal.high * 1.2) {
      barColor = 'bg-accent-red'
      textColor = 'text-accent-red'
    }
  }

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? 'text-accent-green' : trend === 'down' ? 'text-accent-red' : 'text-slate-500'

  return (
    <div className="bg-navy-700/50 rounded-lg p-3 border border-navy-600/50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon && <span className="text-slate-400">{icon}</span>}
          <span className="text-xs text-slate-400 uppercase tracking-wide">{label}</span>
        </div>
        {trend && (
          <TrendIcon size={14} className={trendColor} />
        )}
      </div>
      
      <div className="flex items-baseline gap-1 mb-2">
        <span className={`text-xl font-mono font-bold ${textColor}`}>
          {format(value)}
        </span>
        <span className="text-xs text-slate-500">{unit}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-navy-600 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${clampedPercentage}%` }}
        />
      </div>

      {/* Optimal range indicator */}
      {optimal && (
        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
          <span>{min}</span>
          <span className="text-accent-green">
            {optimal.low}-{optimal.high}
          </span>
          <span>{max}</span>
        </div>
      )}
    </div>
  )
}
