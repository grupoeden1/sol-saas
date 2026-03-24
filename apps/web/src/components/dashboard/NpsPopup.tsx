'use client'

import { useEffect, useState, useCallback } from 'react'

interface NpsCampaign {
  id: string
  question: string
}

export default function NpsPopup() {
  const [campaign, setCampaign] = useState<NpsCampaign | null>(null)
  const [visible, setVisible] = useState(false)
  const [shown, setShown] = useState(false)
  const [selectedScore, setSelectedScore] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [hoveredStar, setHoveredStar] = useState<number | null>(null)

  useEffect(() => {
    if (shown) return

    const fetchNps = async () => {
      try {
        const res = await fetch('/api/nps/active')
        if (!res.ok) return
        const data = await res.json()
        if (data.campaign) {
          setCampaign(data.campaign)
          setVisible(true)
          setShown(true)
        }
      } catch {
        // Silently fail — NPS popup is not critical
      }
    }

    const timer = setTimeout(fetchNps, 2000)
    return () => clearTimeout(timer)
  }, [shown])

  const handleSubmit = useCallback(async (score: number) => {
    if (!campaign) return
    setSelectedScore(score)
    setSubmitted(true)

    fetch('/api/nps/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId: campaign.id, score }),
    }).catch(() => {})

    // Auto-close after showing thank you
    setTimeout(() => setVisible(false), 2000)
  }, [campaign])

  const handleDismiss = useCallback(() => {
    if (!campaign) return
    fetch('/api/nps/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId: campaign.id }),
    }).catch(() => {})
    setVisible(false)
  }, [campaign])

  if (!visible || !campaign) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md rounded-2xl border border-solar-800/30 bg-background-secondary p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-foreground-muted transition-colors hover:bg-background-tertiary hover:text-foreground"
          aria-label="Fechar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {submitted ? (
          /* Thank you state */
          <div className="py-4 text-center">
            <div className="mb-3 text-4xl">&#10024;</div>
            <h3 className="mb-1 text-lg font-bold text-foreground">Obrigado!</h3>
            <p className="text-sm text-foreground-muted">
              Sua avaliacao nos ajuda a melhorar o SOL.
            </p>
          </div>
        ) : (
          /* Survey state */
          <>
            <div className="mb-2 inline-flex rounded-full bg-solar-500/20 px-3 py-1 text-xs font-bold text-solar-400">
              Pesquisa
            </div>

            <h3 className="mb-2 text-lg font-bold text-foreground">
              Avalie sua experiencia
            </h3>

            <p className="mb-6 text-sm leading-relaxed text-foreground-muted">
              {campaign.question}
            </p>

            {/* Star rating */}
            <div className="mb-6 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = hoveredStar !== null ? star <= hoveredStar : star <= (selectedScore ?? 0)
                return (
                  <button
                    key={star}
                    onClick={() => handleSubmit(star)}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(null)}
                    className="rounded-lg p-1 transition-transform hover:scale-110"
                    aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
                  >
                    <svg
                      width="36"
                      height="36"
                      viewBox="0 0 24 24"
                      fill={isFilled ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={isFilled ? 'text-solar-400' : 'text-foreground-muted/40'}
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                )
              })}
            </div>

            <div className="flex justify-between px-2 text-[10px] text-foreground-muted/50">
              <span>Muito ruim</span>
              <span>Excelente</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
