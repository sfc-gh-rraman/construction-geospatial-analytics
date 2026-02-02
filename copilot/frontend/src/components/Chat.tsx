import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
  intent?: string
  timestamp: Date
}

interface ChatProps {
  onContextUpdate?: (context: any) => void
}

// Use relative URL for SPCS compatibility
const API_BASE = ''

export function Chat({ onContextUpdate }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: `🏗️ **GroundTruth Construction Co-Pilot**

I'm your AI assistant for construction geospatial analytics. I can help you with:

• **Ghost Cycles**: Find equipment wasting fuel
• **Traffic & Routes**: Predict choke points and optimize routes
• **Cycle Times**: Analyze and predict haul cycles
• **ML Insights**: Explain model predictions

What would you like to know about your site operations?`,
      timestamp: new Date(),
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      })

      if (!response.ok) throw new Error('Chat request failed')

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        sources: data.sources,
        intent: data.intent,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Update context panel
      if (onContextUpdate && data.context) {
        onContextUpdate(data.context)
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatContent = (content: string) => {
    // Simple markdown-like formatting
    return content
      .split('\n')
      .map((line, i) => {
        // Headers
        if (line.startsWith('###')) {
          return <h3 key={i} className="text-lg font-semibold text-stone-200 mt-3 mb-1">{line.replace('###', '').trim()}</h3>
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} className="font-semibold text-stone-200">{line.replace(/\*\*/g, '')}</p>
        }
        // Bullet points
        if (line.startsWith('•') || line.startsWith('-')) {
          return <p key={i} className="ml-4 text-stone-300">{line}</p>
        }
        // Emoji lines (alerts, status)
        if (line.match(/^[🔴🟡🟢🚧👻⚠️✅💰💡📊⏱️🎯📋🛣️🤖]/)) {
          return <p key={i} className="text-stone-200 font-medium">{line}</p>
        }
        return <p key={i}>{line}</p>
      })
  }

  const getIntentBadge = (intent?: string) => {
    if (!intent) return null
    
    const badges: Record<string, { color: string; label: string }> = {
      ghost_cycle: { color: 'bg-orange-500/20 text-orange-400', label: 'Ghost Cycle' },
      route: { color: 'bg-cyan-500/20 text-cyan-400', label: 'Routing' },
      cycle_time: { color: 'bg-amber-500/20 text-amber-400', label: 'Cycle Time' },
      ml_explain: { color: 'bg-purple-500/20 text-purple-400', label: 'ML Insight' },
      status: { color: 'bg-emerald-500/20 text-emerald-400', label: 'Status' },
      search: { color: 'bg-blue-500/20 text-blue-400', label: 'Search' },
    }
    
    const badge = badges[intent] || { color: 'bg-stone-500/20 text-stone-400', label: intent }
    
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-amber to-accent-orange flex items-center justify-center flex-shrink-0">
                <Bot size={16} className="text-white" />
              </div>
            )}
            
            <div
              className={`max-w-[80%] ${
                message.role === 'user'
                  ? 'bg-accent-amber/10 border border-accent-amber/20 rounded-2xl rounded-br-sm px-4 py-3'
                  : 'card rounded-2xl rounded-tl-sm px-4 py-3'
              }`}
            >
              {message.role === 'assistant' && message.intent && (
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={12} className="text-accent-amber" />
                  {getIntentBadge(message.intent)}
                </div>
              )}
              
              <div className="text-sm text-stone-300 space-y-1">
                {formatContent(message.content)}
              </div>
              
              {message.sources && message.sources.length > 0 && (
                <div className="mt-3 pt-2 border-t border-earth-700">
                  <p className="text-xs text-stone-500 mb-1">Sources:</p>
                  <div className="flex flex-wrap gap-1">
                    {message.sources.map((source, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-earth-700 rounded text-stone-400">
                        {source}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-earth-700 flex items-center justify-center flex-shrink-0">
                <User size={16} className="text-stone-400" />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-amber to-accent-orange flex items-center justify-center">
              <Loader2 size={16} className="text-white animate-spin" />
            </div>
            <div className="card rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-2 text-stone-400 text-sm">
                <span>Analyzing</span>
                <span className="animate-pulse">...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-earth-700 bg-earth-800/50">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about Ghost Cycles, choke points, cycle times..."
            className="chat-input flex-1"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="px-4 py-3 bg-gradient-to-r from-accent-amber to-accent-orange rounded-xl text-white font-medium 
                       disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-accent-amber/20 
                       transition-all duration-200"
          >
            <Send size={18} />
          </button>
        </div>
        
        {/* Quick Actions */}
        <div className="flex gap-2 mt-3">
          {['Ghost Cycle alerts', 'Choke points?', 'Cycle time analysis'].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setInput(suggestion)}
              className="text-xs px-3 py-1.5 bg-earth-700/50 border border-earth-600 rounded-full text-stone-400 
                         hover:text-stone-200 hover:border-earth-500 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
