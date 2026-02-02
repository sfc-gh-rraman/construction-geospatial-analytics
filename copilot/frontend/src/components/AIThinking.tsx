import { Loader2, Database, Search, Brain } from 'lucide-react'

interface AIThinkingProps {
  stage?: 'analyzing' | 'searching' | 'generating'
}

export function AIThinking({ stage = 'analyzing' }: AIThinkingProps) {
  const stages = {
    analyzing: { icon: Brain, text: 'Analyzing your question...' },
    searching: { icon: Search, text: 'Searching site data...' },
    generating: { icon: Database, text: 'Generating response...' },
  }

  const current = stages[stage]
  const Icon = current.icon

  return (
    <div className="flex items-center gap-3 text-slate-400">
      <div className="relative">
        <Icon size={16} className="text-accent-amber" />
        <div className="absolute inset-0 animate-ping">
          <Icon size={16} className="text-accent-amber opacity-50" />
        </div>
      </div>
      <span className="text-sm">{current.text}</span>
      <Loader2 size={14} className="animate-spin" />
    </div>
  )
}

interface QueryExecutionProps {
  sql?: string
  rowCount?: number
}

export function QueryExecution({ sql, rowCount }: QueryExecutionProps) {
  if (!sql) return null

  return (
    <div className="mt-3 pt-3 border-t border-navy-600/50">
      <details className="text-xs">
        <summary className="text-slate-400 cursor-pointer hover:text-slate-300 flex items-center gap-2">
          <Database size={12} className="text-accent-cyan" />
          Query executed {rowCount !== undefined && `(${rowCount} rows)`}
        </summary>
        <pre className="mt-2 p-2 bg-navy-900/50 rounded text-slate-500 overflow-x-auto">
          {sql}
        </pre>
      </details>
    </div>
  )
}
