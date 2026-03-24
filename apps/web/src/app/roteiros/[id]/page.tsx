'use client'

import { useCredits } from '@/components/layout/CreditsProvider'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import ReactMarkdown from 'react-markdown'
import { PerformancePanel } from '@/components/performance/PerformancePanel'
import { TtsButton } from '@/components/tts/TtsButton'

function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const handleCopy = () => {
    if (!navigator.clipboard) return
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  return (
    <button
      onClick={handleCopy}
      aria-label="Copiar mensagem"
      className="rounded-md p-1 text-foreground-muted/50 transition-all hover:bg-solar-500/10 hover:text-foreground-muted"
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-solar-300">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  )
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: Date
}

export default function RoteiroPage() {
  const { credits, updateCredits } = useCredits()
  const params = useParams()
  const router = useRouter()
  const conversationId = params.id as string

  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [noCredits, setNoCredits] = useState(credits <= 0)
  const [inputValue, setInputValue] = useState('')
  const [isQuiz, setIsQuiz] = useState(false)
  const [activeTab, setActiveTab] = useState<'roteiro' | 'performance'>('roteiro')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setNoCredits(credits <= 0)
  }, [credits])

  // Load messages
  useEffect(() => {
    fetch(`/api/conversations/${conversationId}/messages`)
      .then(async (res) => {
        if (!res.ok) {
          router.push('/roteiros')
          return
        }
        const data = await res.json()
        setMessages(
          data.messages.map((msg: { id: string; role: string; content: string; createdAt: string }) => ({
            ...msg,
            createdAt: new Date(msg.createdAt),
          }))
        )
        setIsQuiz(!!data.quizSessionId)
      })
      .catch(() => router.push('/roteiros'))
      .finally(() => setLoading(false))
  }, [conversationId, router])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(async () => {
    const content = inputValue.trim()
    if (!content || sending || noCredits) return

    setInputValue('')
    if (textareaRef.current) textareaRef.current.style.height = '44px'

    const userMessageId = `temp-user-${Date.now()}`
    const userMessage: Message = {
      id: userMessageId,
      role: 'user',
      content,
      createdAt: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setSending(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          message: content,
        }),
      })

      if (res.status === 402) {
        setMessages((prev) => prev.filter((msg) => msg.id !== userMessageId))
        setNoCredits(true)
        updateCredits(0)
        setSending(false)
        return
      }

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }

      const creditsHeader = res.headers.get('X-Credits-Remaining')
      if (creditsHeader !== null) {
        const parsed = parseInt(creditsHeader, 10)
        if (!isNaN(parsed)) {
          updateCredits(parsed)
          setNoCredits(parsed <= 0)
        }
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No reader available')

      const decoder = new TextDecoder()
      let aiMessage = ''
      const aiMessageId = `temp-ai-${Date.now()}`

      setMessages((prev) => [
        ...prev,
        { id: aiMessageId, role: 'assistant', content: '', createdAt: new Date() },
      ])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.error) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMessageId ? { ...msg, content: data.error } : msg
                  )
                )
                setSending(false)
                return
              }

              if (data.done) {
                if (typeof data.credits === 'number') {
                  updateCredits(data.credits)
                  setNoCredits(data.credits <= 0)
                }
                setSending(false)
                break
              }

              if (data.token) {
                aiMessage += data.token
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMessageId ? { ...msg, content: aiMessage } : msg
                  )
                )
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e)
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Desculpe, ocorreu um erro. Tente novamente.',
          createdAt: new Date(),
        },
      ])
      setSending(false)
    }
  }, [inputValue, sending, noCredits, conversationId, updateCredits])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = () => {
    const el = textareaRef.current
    if (el) {
      el.style.height = '44px'
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-solar-500 border-t-transparent" />
      </div>
    )
  }

  // First assistant message is the script
  const scriptMessage = messages.find((m) => m.role === 'assistant')


  return (
    <div className="mx-auto flex h-[calc(100dvh-6rem)] max-w-4xl flex-col px-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-solar-800/20 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/roteiros')}
            className="text-sm text-muted-foreground hover:text-solar-400"
          >
            ← Roteiros
          </button>
        </div>

        {isQuiz && (
          <div className="flex gap-1 rounded-lg bg-background-secondary p-0.5">
            <button
              onClick={() => setActiveTab('roteiro')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                activeTab === 'roteiro'
                  ? 'bg-solar-500/20 text-solar-400'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Roteiro
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                activeTab === 'performance'
                  ? 'bg-solar-500/20 text-solar-400'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Performance
            </button>
          </div>
        )}
      </div>

      {/* Performance tab */}
      {activeTab === 'performance' && isQuiz && (
        <div className="flex-1 overflow-y-auto py-4">
          <PerformancePanel conversationId={conversationId} isQuiz={isQuiz} />
        </div>
      )}

      {/* Messages area (Roteiro tab) */}
      {activeTab === 'roteiro' && (<>

      <div className="flex-1 overflow-y-auto pb-32 pt-4">
        {messages.map((message) => {
          const isUser = message.role === 'user'
          const isScript = message === scriptMessage

          return (
            <div
              key={message.id}
              className={`mb-4 flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`${isScript ? 'max-w-full' : 'max-w-[80%] md:max-w-[70%]'}`}>
                {!isUser && (
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <Logo size={16} />
                    <span className="text-xs font-medium text-solar-300">SOL</span>
                    {isScript && (
                      <span className="rounded-full bg-solar-500/10 px-2 py-0.5 text-xs text-solar-400">
                        Roteiro
                      </span>
                    )}
                  </div>
                )}

                <div
                  className={`relative rounded-2xl px-4 py-3 ${
                    isUser
                      ? 'border border-solar-500/30 bg-solar-500/10 text-foreground'
                      : isScript
                        ? 'group border border-solar-500/20 bg-background-secondary text-foreground'
                        : 'group border border-solar-800/30 bg-background-secondary text-foreground'
                  }`}
                >
                  <div className="prose prose-sm prose-invert max-w-none break-words text-sm leading-relaxed [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:mb-2 [&>ol]:mb-2 [&>h1]:text-lg [&>h2]:text-base [&>h3]:text-sm">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                  {!isUser && message.content && (
                    <div className="absolute right-2 top-2 flex items-center gap-0.5 md:opacity-0 md:group-hover:opacity-100">
                      <TtsButton messageId={message.id} messageContent={message.content} />
                      <CopyButton content={message.content} />
                    </div>
                  )}
                </div>

                <p
                  className={`mt-1 text-xs text-foreground-muted/60 ${isUser ? 'text-right' : 'text-left'}`}
                >
                  {formatDistanceToNow(message.createdAt, {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </p>
              </div>
            </div>
          )
        })}

        {sending && messages[messages.length - 1]?.content === '' && (
          <div className="mb-4 flex justify-start">
            <div>
              <div className="mb-1.5 flex items-center gap-1.5">
                <Logo size={16} />
                <span className="text-xs font-medium text-solar-300">SOL</span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-2xl border border-solar-800/20 bg-background-secondary px-4 py-3">
                <span className="text-xs text-foreground-muted">Digitando</span>
                <div className="loading-dot" />
                <div className="loading-dot" />
                <div className="loading-dot" />
              </div>
            </div>
          </div>
        )}

        {noCredits && (
          <div
            role="alert"
            className="my-4 rounded-xl border border-solar-500/50 bg-solar-500/10 p-4"
          >
            <p className="text-sm text-solar-300">
              Você ficou sem créditos.{' '}
              <Link
                href="/credits/buy"
                className="font-medium underline transition-all hover:text-solar-200"
              >
                Comprar créditos →
              </Link>
            </p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat input for iteration */}
      <div className="absolute bottom-4 left-0 right-0 z-10 px-4">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-end gap-2 rounded-2xl border border-solar-800/30 bg-background-secondary/80 p-2 shadow-xl shadow-black/20 backdrop-blur-xl md:p-3">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={handleInput}
              disabled={sending || noCredits}
              placeholder={
                noCredits
                  ? 'Compre créditos para continuar...'
                  : 'Peça ajustes no roteiro... ex: "mude o gancho para algo mais provocativo"'
              }
              className={`flex-1 resize-none rounded-xl bg-transparent px-4 py-3 text-sm text-foreground outline-none transition-all ${
                noCredits
                  ? 'cursor-not-allowed opacity-50 placeholder:text-red-400/60'
                  : 'placeholder:text-foreground-muted/40 focus:text-foreground'
              }`}
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={sending || noCredits || !inputValue.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-solar-500 text-background transition-all hover:bg-solar-600 hover:shadow-lg hover:shadow-solar-500/25 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Enviar mensagem"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="ml-0.5"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      </>)}
    </div>
  )
}
