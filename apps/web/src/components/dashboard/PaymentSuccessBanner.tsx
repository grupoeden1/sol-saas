'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PaymentSuccessBanner() {
  const [visible, setVisible] = useState(true)
  const router = useRouter()

  if (!visible) return null

  const handleDismiss = () => {
    setVisible(false)
    // Clean up the URL query param
    router.replace('/dashboard', { scroll: false })
  }

  return (
    <div className="mb-6 flex items-center justify-between rounded-xl border border-green-500/30 bg-green-500/10 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/20">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-green-400">
            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-green-300">Pagamento confirmado!</p>
          <p className="text-xs text-green-400/70">Seus créditos foram adicionados à sua conta.</p>
        </div>
      </div>
      <button
        onClick={handleDismiss}
        className="shrink-0 rounded-lg p-1.5 text-green-400/50 transition-colors hover:bg-green-500/10 hover:text-green-400"
        aria-label="Fechar"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}
