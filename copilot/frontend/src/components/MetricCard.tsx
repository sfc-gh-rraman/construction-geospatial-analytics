import { ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string | number
  unit?: string
  icon?: ReactNode
  trend?: 'up' | 'down' | 'flat'
  trendValue?: string
  status?: 'good' | 'warning' | 'danger' | 'neutral'
  size?: 'sm' | 'md' | 'lg'
}

export function MetricCard({ 
  label, 
  value, 
  unit, 
  icon, 
  trend, 
  trendValue,
  status = 'neutral',
  size = 'md'
}: MetricCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null
    if (trend === 'up') return <TrendingUp size={14} className="text-accent-emerald" />
    if (trend === 'down') return <TrendingDown size={14} className="text-safety-red" />
    return <Minus size={14} className="text-stone-500" />
  }

  const getStatusColor = () => {
    switch (status) {
      case 'good': return 'text-accent-emerald'
      case 'warning': return 'text-safety-yellow'
      case 'danger': return 'text-safety-red'
      default: return 'text-accent-amber'
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'p-3'
      case 'lg': return 'p-5'
      default: return 'p-4'
    }
  }

  const getValueSize = () => {
    switch (size) {
      case 'sm': return 'text-xl'
      case 'lg': return 'text-4xl'
      default: return 'text-2xl'
    }
  }

  return (
    <div className={`card card-hover ${getSizeClasses()}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 text-stone-500">
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </div>
        {trend && (
          <div className="flex items-center gap-1">
            {getTrendIcon()}
            {trendValue && <span className="text-xs text-stone-500">{trendValue}</span>}
          </div>
        )}
      </div>
      
      <div className="flex items-baseline gap-1">
        <span className={`font-mono font-semibold ${getValueSize()} ${getStatusColor()} metric-glow`}>
          {value}
        </span>
        {unit && (
          <span className="text-sm text-stone-500">{unit}</span>
        )}
      </div>
    </div>
  )
}
