'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/admin/ai', label: 'Provedor de IA' },
  { href: '/admin/pricing', label: 'Simulador de Pricing' },
  { href: '/admin/results', label: 'Resultados' },
  { href: '/admin/intelligence', label: 'Inteligencia' },
  { href: '/admin/subscriptions', label: 'Assinaturas' },
  { href: '/admin/referral', label: 'Referral' },
  { href: '/admin/promos', label: 'Promocoes' },
  { href: '/admin/upsell', label: 'Upsell' },
  { href: '/admin/nps', label: 'NPS' },
  { href: '/admin/knowledge', label: 'Base de Conhecimento' },
  { href: '/admin/prompts', label: 'Prompts da IA' },
  { href: '/admin/integrations', label: 'Integracoes API' },
];

export default function AdminNav() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-solar-500/10 text-solar-300 transition-all hover:bg-solar-500/20"
        aria-label="Menu de navegação"
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-solar-800/30 bg-background-secondary/95 py-2 shadow-2xl backdrop-blur-xl">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-foreground-muted transition-colors hover:bg-solar-500/10 hover:text-solar-300"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
