import { useState, useRef, useEffect } from 'react'
import { Send, User, Sparkles, Database, AlertTriangle, CheckCircle, Loader2, Code, ChevronDown, ChevronUp, BarChart3, Compass } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { VegaChart } from './VegaChart'

interface ThinkingStep {
  id: string
  title: string
  content: string
  status: 'pending' | 'in_progress' | 'completed'
  sql?: string
}

interface ChartSpec {
  $schema?: string
  data?: unknown
  mark?: unknown
  encoding?: unknown
  [key: string]: unknown
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
  intent?: string
  visualization?: string
  alert_level?: string
  timestamp: Date
  thinkingSteps?: ThinkingStep[]
  isStreaming?: boolean
  chartSpec?: ChartSpec
}

interface ChatProps {
  siteId?: string
  onVisualizationRequest?: (type: string, data?: Record<string, unknown>) => void
  onContextUpdate?: (context: Record<string, unknown>) => void
}

const SUGGESTED_QUESTIONS = [
  "Show me Ghost Cycle patterns",
  "What sites have the most traffic?",
  "Which equipment is least efficient?",
  "Find choke points on haul roads",
  "Summarize fleet utilization",
  "What's the cycle time for Site Alpha?",
]

export function Chat({ siteId, onVisualizationRequest }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `👋 Hello! I'm **TERRA**, your Terrain & Equipment Route Resource Advisor.

I can help you analyze your construction operations across 8 sites with 152 equipment units. Ask me about:

- 🚜 **Ghost Cycles** - Find equipment wasting fuel
- 🛣️ **Choke Points** - Detect haul road bottlenecks
- ⏱️ **Cycle Times** - Optimize haul cycles
- 📊 **Fleet Analytics** - Site-wide efficiency metrics

Try asking: *"Show me Ghost Cycle patterns"*`,
      sources: [],
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showThinking, setShowThinking] = useState<Record<string, boolean>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessageWithStream = async (content: string) => {
    if (!content.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    const assistantId = (Date.now() + 1).toString()
    
    // Initialize assistant message with thinking steps
    const initialAssistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      thinkingSteps: [],
      isStreaming: true,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, initialAssistantMessage])
    setShowThinking(prev => ({ ...prev, [assistantId]: true }))

    try {
      // Build conversation history from previous messages (excluding welcome message and empty/streaming messages)
      const conversationHistory = messages
        .filter(m => m.id !== '1' && m.content && m.content.trim().length > 0 && !m.isStreaming)
        .map(m => ({ role: m.role, content: m.content }))
      
      // Try streaming endpoint first
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content.trim(),
          site_id: siteId,
          conversation_history: conversationHistory.length > 0 ? conversationHistory : undefined
        })
      })

      if (!response.ok || !response.body) {
        throw new Error('Streaming not available')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''
      const thinkingSteps: ThinkingStep[] = []
      let sources: string[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        
        // Process complete events
        const events = buffer.split('\n\n')
        buffer = events.pop() || ''

        for (const eventStr of events) {
          if (!eventStr.trim() || !eventStr.startsWith('data:')) continue
          
          const dataStr = eventStr.replace('data:', '').trim()
          if (dataStr === '[DONE]') continue

          try {
            const event = JSON.parse(dataStr)
            
            // Handle different event types from Cortex Agent
            if (event.type === 'text') {
              // ACTUAL OUTPUT TEXT - this is what we show to the user
              fullContent += event.content || ''
              setMessages(prev => prev.map(msg => 
                msg.id === assistantId 
                  ? { ...msg, content: fullContent }
                  : msg
              ))
            } else if (event.type === 'thinking') {
              // Agent's internal reasoning - accumulate but don't show as main content
              const thinkingText = event.content || ''
              // Only add substantial thinking steps
              if (thinkingText.length > 20) {
                const step: ThinkingStep = {
                  id: `step-${Date.now()}`,
                  title: event.title || 'Reasoning',
                  content: thinkingText.slice(0, 200) + (thinkingText.length > 200 ? '...' : ''),
                  status: 'in_progress',
                  sql: event.sql
                }
                // Limit to last 5 thinking steps to avoid clutter
                if (thinkingSteps.length >= 5) {
                  thinkingSteps.shift()
                }
                thinkingSteps.push(step)
                thinkingSteps.slice(0, -1).forEach(s => s.status = 'completed')
                
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantId 
                    ? { ...msg, thinkingSteps: [...thinkingSteps] }
                    : msg
                ))
              }
            } else if (event.type === 'status' || event.type === 'tool_status') {
              // Status updates - add as thinking steps
              const step: ThinkingStep = {
                id: `status-${Date.now()}`,
                title: event.title || event.status || 'Processing',
                content: '',
                status: 'in_progress'
              }
              thinkingSteps.push(step)
              thinkingSteps.slice(0, -1).forEach(s => s.status = 'completed')
              
              setMessages(prev => prev.map(msg => 
                msg.id === assistantId 
                  ? { ...msg, thinkingSteps: [...thinkingSteps] }
                  : msg
              ))
            } else if (event.type === 'tool_result') {
              // Tool execution result - may contain SQL and data
              if (event.sql) {
                const sqlStep: ThinkingStep = {
                  id: `sql-${Date.now()}`,
                  title: 'SQL Executed',
                  content: event.error || 'Query completed',
                  status: event.error ? 'pending' : 'completed',
                  sql: event.sql
                }
                thinkingSteps.push(sqlStep)
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantId 
                    ? { ...msg, thinkingSteps: [...thinkingSteps] }
                    : msg
                ))
              }
            } else if (event.type === 'sources') {
              sources = event.sources || []
            } else if (event.type === 'chart') {
              // Chart/visualization from the agent
              const chartSpec = event.chart_spec
              if (chartSpec) {
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantId 
                    ? { ...msg, chartSpec }
                    : msg
                ))
              }
            } else if (event.type === 'error') {
              // Check if this is an SPCS-related error (local development)
              const errorContent = event.content || 'An error occurred'
              if (errorContent.includes('SPCS') || errorContent.includes('token')) {
                // Throw to trigger fallback to /api/chat
                throw new Error('SPCS not available - falling back to local chat')
              }
              fullContent += `\n\n⚠️ ${errorContent}`
              setMessages(prev => prev.map(msg => 
                msg.id === assistantId 
                  ? { ...msg, content: fullContent }
                  : msg
              ))
            } else if (event.type === 'done') {
              // Stream complete
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }

      // Mark all thinking steps as completed
      thinkingSteps.forEach(s => s.status = 'completed')
      
      // Final update
      setMessages(prev => prev.map(msg => 
        msg.id === assistantId 
          ? { 
              ...msg, 
              content: fullContent || 'I processed your request.',
              thinkingSteps: [...thinkingSteps],
              sources,
              isStreaming: false 
            }
          : msg
      ))

      // Collapse thinking after streaming completes
      setTimeout(() => {
        setShowThinking(prev => ({ ...prev, [assistantId]: false }))
      }, 2000)

    } catch (error) {
      console.log('Streaming failed, falling back to local:', error)
      
      // Fallback to local endpoint
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content.trim(),
            site_id: siteId
          })
        })

        if (!response.ok) throw new Error('Failed to get response')

        const data = await response.json()
        
        setMessages(prev => prev.map(msg => 
          msg.id === assistantId 
            ? { 
                ...msg, 
                content: data.response,
                sources: data.sources,
                intent: data.intent,
                visualization: data.visualization,
                alert_level: data.alert_level,
                isStreaming: false,
                thinkingSteps: [
                  { id: 'step-1', title: 'Query Processing', content: 'Analyzed your question', status: 'completed' as const },
                  { id: 'step-2', title: 'Data Retrieval', content: 'Retrieved data from Snowflake', status: 'completed' as const },
                ]
              }
            : msg
        ))

        if (data.visualization && onVisualizationRequest) {
          onVisualizationRequest(data.visualization, data.context)
        }
      } catch (fallbackError) {
        console.error('Chat error:', fallbackError)
        setMessages(prev => prev.map(msg => 
          msg.id === assistantId 
            ? { 
                ...msg, 
                content: 'I encountered an error. Please try rephrasing your question.',
                isStreaming: false 
              }
            : msg
        ))
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessageWithStream(input)
  }

  const toggleThinking = (messageId: string) => {
    setShowThinking(prev => ({ ...prev, [messageId]: !prev[messageId] }))
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div 
            key={message.id}
            className={`flex gap-3 chat-message ${
              message.role === 'user' ? 'justify-end' : ''
            }`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-terra-amber to-terra-orange flex items-center justify-center">
                <Compass size={16} className="text-white" />
              </div>
            )}
            
            <div className={`max-w-[85%] ${message.role === 'user' ? 'order-first' : ''}`}>
              {/* Thinking Steps Panel */}
              {message.role === 'assistant' && message.thinkingSteps && message.thinkingSteps.length > 0 && (
                <div className="mb-2">
                  <button
                    onClick={() => toggleThinking(message.id)}
                    className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-300 transition-colors mb-1"
                  >
                    <span className="flex items-center gap-1">
                      {message.isStreaming ? (
                        <Loader2 size={12} className="animate-spin text-terra-amber" />
                      ) : (
                        <CheckCircle size={12} className="text-terra-green" />
                      )}
                      <span>Thinking steps ({message.thinkingSteps.length})</span>
                    </span>
                    {showThinking[message.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  
                  {showThinking[message.id] && (
                    <div className="bg-navy-900/50 border border-navy-700/50 rounded-lg p-3 space-y-2">
                      {message.thinkingSteps.map((step) => (
                        <div key={step.id} className="flex items-start gap-2">
                          {step.status === 'completed' ? (
                            <CheckCircle size={14} className="text-terra-green mt-0.5 flex-shrink-0" />
                          ) : step.status === 'in_progress' ? (
                            <Loader2 size={14} className="animate-spin text-terra-amber mt-0.5 flex-shrink-0" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border border-slate-600 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-slate-300">{step.title}</div>
                            <div className="text-xs text-slate-500">{step.content}</div>
                            {step.sql && (
                              <div className="mt-1 p-2 bg-navy-800 rounded text-xs font-mono text-slate-400 overflow-x-auto">
                                <div className="flex items-center gap-1 text-terra-amber mb-1">
                                  <Code size={10} />
                                  <span>SQL</span>
                                </div>
                                <pre className="whitespace-pre-wrap break-all">{step.sql.slice(0, 200)}...</pre>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Message Content */}
              <div 
                className={`rounded-lg p-4 ${
                  message.role === 'user' 
                    ? 'bg-terra-amber text-white' 
                    : 'bg-navy-800 border border-navy-600/50'
                }`}
              >
                {message.role === 'assistant' ? (
                  <div className="markdown-content">
                    {message.isStreaming && !message.content ? (
                      <div className="flex items-center gap-2 text-slate-400">
                        <Loader2 size={14} className="animate-spin" />
                        <span>Processing...</span>
                      </div>
                    ) : (
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    )}
                    
                    {/* Chart visualization */}
                    {message.chartSpec && (
                      <div className="mt-4">
                        <div className="flex items-center gap-2 mb-2 text-xs text-terra-amber">
                          <BarChart3 size={14} />
                          <span>Generated Visualization</span>
                        </div>
                        <VegaChart spec={message.chartSpec} className="w-full" />
                      </div>
                    )}
                  </div>
                ) : (
                  <p>{message.content}</p>
                )}
              </div>
              
              {/* Sources and metadata */}
              {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <Database size={12} />
                  <span>Sources:</span>
                  {message.sources.map((source, i) => (
                    <span key={i} className="px-2 py-0.5 bg-navy-700 rounded text-slate-400">
                      {source}
                    </span>
                  ))}
                </div>
              )}

              {message.alert_level === 'high' && (
                <div className="mt-2 flex items-center gap-2 text-xs text-terra-amber">
                  <AlertTriangle size={12} />
                  <span>High-priority insight detected</span>
                </div>
              )}
            </div>

            {message.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-navy-600 flex items-center justify-center">
                <User size={16} className="text-slate-300" />
              </div>
            )}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested questions */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 mb-2 text-xs text-slate-500">
            <Sparkles size={12} />
            <span>Suggested questions</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.slice(0, 4).map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessageWithStream(q)}
                className="px-3 py-1.5 bg-navy-700/50 hover:bg-navy-600/50 rounded-full text-xs text-slate-300 hover:text-white transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-navy-700/50 relative z-10 bg-navy-900/80">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask TERRA anything..."
            className="flex-1 px-4 py-2.5 bg-navy-800 border border-navy-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-terra-amber focus:ring-1 focus:ring-terra-amber/50 transition-all"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  )
}
