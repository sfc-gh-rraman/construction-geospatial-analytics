import { X, AlertTriangle, AlertCircle, Info, Ghost, TrafficCone } from 'lucide-react'

interface Alert {
  id: string
  type: 'ghost_cycle' | 'choke_point' | 'warning' | 'danger' | 'info'
  title: string
  message: string
  recommendation?: string
  equipment_id?: string
  zone_name?: string
  fuel_waste?: number
  timestamp: Date
}

interface AlertCardProps {
  alert: Alert
  onDismiss?: (id: string) => void
}

export function AlertCard({ alert, onDismiss }: AlertCardProps) {
  const getAlertStyles = () => {
    switch (alert.type) {
      case 'ghost_cycle':
        return {
          container: 'ghost-cycle',
          icon: Ghost,
          iconColor: 'text-orange-400',
          badge: 'bg-orange-500/20 text-orange-400'
        }
      case 'choke_point':
        return {
          container: 'choke-point',
          icon: TrafficCone,
          iconColor: 'text-red-400',
          badge: 'bg-red-500/20 text-red-400'
        }
      case 'danger':
        return {
          container: 'alert-glow border-l-4 border-safety-red bg-red-500/5',
          icon: AlertCircle,
          iconColor: 'text-red-400',
          badge: 'bg-red-500/20 text-red-400'
        }
      case 'warning':
        return {
          container: 'border-l-4 border-safety-yellow bg-yellow-500/5',
          icon: AlertTriangle,
          iconColor: 'text-yellow-400',
          badge: 'bg-yellow-500/20 text-yellow-400'
        }
      default:
        return {
          container: 'border-l-4 border-accent-cyan bg-cyan-500/5',
          icon: Info,
          iconColor: 'text-cyan-400',
          badge: 'bg-cyan-500/20 text-cyan-400'
        }
    }
  }

  const styles = getAlertStyles()
  const Icon = styles.icon

  return (
    <div className={`card ${styles.container} p-3 animate-slide-up`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 mt-0.5 ${styles.iconColor}`}>
          <Icon size={18} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${styles.badge}`}>
              {alert.type === 'ghost_cycle' ? 'Ghost Cycle' : 
               alert.type === 'choke_point' ? 'Choke Point' :
               alert.type.charAt(0).toUpperCase() + alert.type.slice(1)}
            </span>
            {alert.equipment_id && (
              <span className="text-xs text-stone-500 font-mono">{alert.equipment_id}</span>
            )}
            {alert.zone_name && (
              <span className="text-xs text-stone-500">{alert.zone_name}</span>
            )}
          </div>
          
          <h4 className="text-sm font-medium text-stone-200 mb-1">{alert.title}</h4>
          <p className="text-xs text-stone-400">{alert.message}</p>
          
          {alert.fuel_waste && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-orange-400">💰 Est. waste: {alert.fuel_waste.toFixed(1)} gal/hr</span>
            </div>
          )}
          
          {alert.recommendation && (
            <div className="mt-2 p-2 bg-earth-700/30 rounded-lg">
              <p className="text-xs text-accent-amber">💡 {alert.recommendation}</p>
            </div>
          )}
        </div>

        {onDismiss && (
          <button
            onClick={() => onDismiss(alert.id)}
            className="flex-shrink-0 p-1 hover:bg-earth-700 rounded transition-colors"
          >
            <X size={14} className="text-stone-500" />
          </button>
        )}
      </div>
    </div>
  )
}
