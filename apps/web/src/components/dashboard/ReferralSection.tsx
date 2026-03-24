'use client'

import { useState, useEffect, useCallback } from 'react'

interface ReferralItem {
  maskedEmail: string
  status: string
  createdAt: string
}

interface ReferralStatsData {
  referralCode: string | null
  totalReferrals: number
  creditsEarned: number
  referrals: ReferralItem[]
}

interface ReferralSectionProps {
  enabled: boolean
  referralCode: string | null
  initialStats: ReferralStatsData | null
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING:
      'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    CREDITED:
      'bg-green-500/10 text-green-400 border-green-500/30',
    EXPIRED:
      'bg-red-500/10 text-red-400 border-red-500/30',
  }

  const labels: Record<string, string> = {
    PENDING: 'Pendente',
    CREDITED: 'Creditado',
    EXPIRED: 'Expirado',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
        styles[status] ?? 'bg-gray-500/10 text-gray-400 border-gray-500/30'
      }`}
    >
      {labels[status] ?? status}
    </span>
  )
}

export default function ReferralSection({
  enabled,
  referralCode: initialCode,
  initialStats,
}: ReferralSectionProps) {
  const [stats, setStats] = useState<ReferralStatsData | null>(initialStats)
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)
  const [loading, setLoading] = useState(!initialStats)

  const referralCode = stats?.referralCode ?? initialCode
  const shareUrl =
    typeof window !== 'undefined' && referralCode
      ? `${window.location.origin}/?ref=${referralCode}`
      : ''

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/referral/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!initialStats && enabled) {
      fetchStats()
    }
  }, [initialStats, enabled, fetchStats])

  if (!enabled) return null

  const copyToClipboard = async (text: string, type: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // Fallback: create a temporary input
      const input = document.createElement('input')
      input.value = text
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SOL - Indique e Ganhe',
          text: 'Use meu codigo de indicacao e ganhe creditos bonus no SOL!',
          url: shareUrl,
        })
      } catch {
        // User cancelled or share failed, fallback to copy
        await copyToClipboard(shareUrl, 'link')
      }
    } else {
      await copyToClipboard(shareUrl, 'link')
    }
  }

  return (
    <div className="rounded-2xl border border-solar-800/20 bg-background-secondary p-6">
      <h2 className="mb-4 text-lg font-semibold text-foreground">
        Indique e Ganhe
      </h2>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-solar-500 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Referral Code */}
          {referralCode && (
            <div className="mb-4">
              <p className="mb-1.5 text-sm text-foreground-muted">
                Seu codigo de indicacao
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg border border-solar-800/30 bg-background px-4 py-2.5 text-center font-mono text-lg font-bold tracking-widest text-solar-400">
                  {referralCode}
                </code>
                <button
                  onClick={() => copyToClipboard(referralCode, 'code')}
                  className="rounded-lg border border-solar-800/30 bg-background px-3 py-2.5 text-sm text-foreground-muted transition-all hover:bg-solar-500/10 hover:text-solar-400"
                >
                  {copied === 'code' ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>
          )}

          {/* Share Link */}
          {shareUrl && (
            <div className="mb-4">
              <p className="mb-1.5 text-sm text-foreground-muted">
                Link de indicacao
              </p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  className="flex-1 rounded-lg border border-solar-800/30 bg-background px-3 py-2 text-sm text-foreground-muted"
                />
                <button
                  onClick={handleShare}
                  className="rounded-lg bg-solar-500 px-4 py-2 text-sm font-semibold text-background transition-all hover:bg-solar-600"
                >
                  {copied === 'link' ? 'Copiado!' : 'Compartilhar'}
                </button>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-solar-800/20 bg-background p-4 text-center">
              <p className="text-2xl font-bold text-foreground">
                {stats?.totalReferrals ?? 0}
              </p>
              <p className="text-xs text-foreground-muted">Indicacoes</p>
            </div>
            <div className="rounded-xl border border-solar-800/20 bg-background p-4 text-center">
              <p className="text-2xl font-bold text-solar-400">
                {stats?.creditsEarned ?? 0}
              </p>
              <p className="text-xs text-foreground-muted">Creditos ganhos</p>
            </div>
          </div>

          {/* Referral List */}
          {stats && stats.referrals.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground-muted">
                Suas indicacoes
              </h3>
              <div className="space-y-2">
                {stats.referrals.map((referral, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-solar-800/10 bg-background px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-foreground">
                        {referral.maskedEmail}
                      </span>
                      <StatusBadge status={referral.status} />
                    </div>
                    <span className="text-xs text-foreground-muted">
                      {new Date(referral.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats && stats.referrals.length === 0 && (
            <p className="text-center text-sm text-foreground-muted">
              Nenhuma indicacao ainda. Compartilhe seu link e comece a ganhar creditos!
            </p>
          )}
        </>
      )}
    </div>
  )
}
