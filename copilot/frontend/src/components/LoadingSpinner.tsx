import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  message?: string
}

export function LoadingSpinner({ size = 'md', message }: LoadingSpinnerProps) {
  const getSize = () => {
    switch (size) {
      case 'sm': return 16
      case 'lg': return 32
      default: return 24
    }
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 size={getSize()} className="text-accent-amber animate-spin" />
      {message && <p className="text-sm text-stone-500">{message}</p>}
    </div>
  )
}
