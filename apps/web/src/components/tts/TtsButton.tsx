'use client'

import { useState, useRef, useEffect } from 'react'
import { useCredits } from '@/components/layout/CreditsProvider'

// Curated Portuguese-compatible voices (eleven_multilingual_v2)
const VOICES = [
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', desc: 'Masculino' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', desc: 'Feminino' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', desc: 'Feminino' },
] as const

interface TtsButtonProps {
  messageId: string
  messageContent: string
}

export function TtsButton({ messageId, messageContent }: TtsButtonProps) {
  const { credits, updateCredits } = useCredits()
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'paused' | 'error'>('idle')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [selectedVoice, setSelectedVoice] = useState<string>(VOICES[0].id)
  const [showVoiceMenu, setShowVoiceMenu] = useState(false)
  const [creditsCharged, setCreditsCharged] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Cleanup audio on unmount
  useEffect(() => {
    const audio = audioRef.current
    return () => {
      if (audio) {
        audio.pause()
        audio.onended = null
        audio.onerror = null
      }
    }
  }, [])

  // Close voice menu on outside click + Escape key
  useEffect(() => {
    if (!showVoiceMenu) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && e.target instanceof Node && !menuRef.current.contains(e.target)) {
        setShowVoiceMenu(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowVoiceMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showVoiceMenu])

  // Estimate credits for tooltip
  const estimatedChars = messageContent.replace(/[#*`\[\]()>-]/g, '').length
  const estimatedCredits = Math.max(1, Math.ceil((estimatedChars / 1000) * 26))

  function getButtonLabel(): string {
    if (credits <= 0) return 'Sem créditos disponíveis'
    if (status === 'loading') return 'Gerando áudio...'
    if (status === 'playing') return 'Pausar áudio'
    if (status === 'paused') return 'Continuar áudio'
    if (status === 'error' && errorMsg) return errorMsg
    if (audioUrl) return 'Reproduzir áudio'
    return `Gerar áudio (~${estimatedCredits} créditos)`
  }

  async function handleGenerate() {
    if (status === 'playing') {
      audioRef.current?.pause()
      setStatus('paused')
      return
    }
    if (status === 'paused') {
      audioRef.current?.play().catch(() => {
        setErrorMsg('Erro ao reproduzir áudio')
        setStatus('error')
      })
      setStatus('playing')
      return
    }

    // If we already have audio URL, just play it
    if (audioUrl) {
      playAudio(audioUrl)
      return
    }

    setStatus('loading')
    setErrorMsg(null)

    try {
      const res = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, voiceId: selectedVoice }),
      })

      const data = await res.json()

      if (res.status === 402) {
        setErrorMsg(`Créditos insuficientes (necessário: ${data.required})`)
        setStatus('error')
        return
      }

      if (!res.ok) {
        setErrorMsg(data.error || 'Erro ao gerar áudio')
        setStatus('error')
        return
      }

      if (typeof data.creditsRemaining === 'number') {
        updateCredits(data.creditsRemaining)
      }
      setCreditsCharged(data.creditsCharged)
      setAudioUrl(data.audioUrl)
      playAudio(data.audioUrl)
    } catch {
      setErrorMsg('Erro de conexão')
      setStatus('error')
    }
  }

  function playAudio(url: string) {
    // Clean up any previous Audio element
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.onended = null
      audioRef.current.onerror = null
    }

    const audio = new Audio(url)
    audioRef.current = audio
    audio.onended = () => setStatus('idle')
    audio.onerror = () => {
      setErrorMsg('Erro ao reproduzir áudio')
      setStatus('error')
    }
    audio.play().catch(() => {
      setErrorMsg('Erro ao reproduzir áudio')
      setStatus('error')
    })
    setStatus('playing')
  }

  // Reset audio when voice changes
  function handleVoiceChange(voiceId: string) {
    setSelectedVoice(voiceId)
    setAudioUrl(null)
    setCreditsCharged(null)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.onended = null
      audioRef.current.onerror = null
      audioRef.current = null
    }
    setStatus('idle')
    setShowVoiceMenu(false)
  }

  const selectedVoiceName = VOICES.find(v => v.id === selectedVoice)?.name || 'Voz'

  return (
    <div className="inline-flex items-center gap-0.5">
      {/* Main TTS button */}
      <button
        onClick={handleGenerate}
        disabled={status === 'loading' || credits <= 0}
        aria-label={getButtonLabel()}
        title={getButtonLabel()}
        className="rounded-md p-1 text-foreground-muted/50 transition-all hover:bg-solar-500/10 hover:text-foreground-muted disabled:cursor-not-allowed disabled:opacity-30"
      >
        {status === 'loading' ? (
          <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        ) : status === 'playing' ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-solar-400">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : status === 'error' ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        )}
      </button>

      {/* Voice selector */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowVoiceMenu(!showVoiceMenu)}
          className="rounded-md px-1 py-0.5 text-[10px] text-foreground-muted/40 transition-all hover:bg-solar-500/10 hover:text-foreground-muted"
          title="Escolher voz"
          aria-expanded={showVoiceMenu}
          aria-haspopup="menu"
        >
          {selectedVoiceName}
        </button>
        {showVoiceMenu && (
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-1 w-40 rounded-lg border border-solar-800/30 bg-background-secondary p-1 shadow-xl"
          >
            {VOICES.map((voice) => (
              <button
                key={voice.id}
                role="menuitem"
                onClick={() => handleVoiceChange(voice.id)}
                className={`w-full rounded-md px-3 py-1.5 text-left text-xs transition-colors ${
                  selectedVoice === voice.id
                    ? 'bg-solar-500/20 text-solar-300'
                    : 'text-foreground-muted hover:bg-solar-500/10'
                }`}
              >
                <span className="font-medium">{voice.name}</span>
                <span className="ml-1 text-foreground-muted/60">— {voice.desc}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Credits charged feedback */}
      {creditsCharged !== null && status !== 'loading' && (
        <span className="text-[10px] text-foreground-muted/40">-{creditsCharged}</span>
      )}

      {/* Accessible error announcement */}
      {errorMsg && status === 'error' && (
        <span role="alert" className="sr-only">{errorMsg}</span>
      )}
    </div>
  )
}
