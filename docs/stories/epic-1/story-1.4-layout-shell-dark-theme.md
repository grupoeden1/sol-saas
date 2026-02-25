# Story 1.4 — Layout Shell & Dark Theme

**Epic:** 1 — Foundation & Auth
**Story ID:** 1.4
**Priority:** High
**Estimate:** 3-5 story points
**Status:** In Progress

---

## User Story

**As a** student,
**I want** a consistent dark-themed layout with my credit balance always visible,
**so that** I always know my usage context.

---

## Context

Esta story implementa o layout visual base do SOL: shell global com header contendo logo/wordmark "SOL", badge de créditos do usuário autenticado, link para comprar créditos e botão de logout. O dark theme é aplicado globalmente usando Tailwind CSS com uma paleta solar (tons quentes: âmbar, dourado, off-white sobre fundo escuro). O badge de créditos deve estar sempre visível no header, buscando o saldo atual do usuário via sessão e exibindo de forma clara. Este é o primeiro contato visual do usuário com o produto após login.

---

## Acceptance Criteria

### AC1: Layout Global com Header

- [ ] Componente `AppLayout` criado em `apps/web/src/components/layout/AppLayout.tsx`
- [ ] Header contém (esquerda para direita):
  - Logo/wordmark "SOL" (texto estilizado, sem necessidade de imagem)
  - Espaçador flex
  - Badge de créditos do usuário
  - Link "Comprar créditos" (redireciona para `/credits/buy` — rota futura)
  - Botão de logout
- [ ] Layout aplicado em todas as páginas autenticadas via `layout.tsx` de `/dashboard`
- [ ] Header tem altura fixa (64px), fundo escuro, e shadow sutil
- [ ] Responsivo: em mobile (<768px), itens do header colapsam adequadamente

**Test:** Acessar `/dashboard` após login → header visível com todos os elementos. Redimensionar janela → layout responsivo.

---

### AC2: Badge de Créditos Visível

- [ ] Badge exibe saldo atual de créditos do usuário autenticado
- [ ] Formato: `🌟 {credits} créditos` (emoji solar + número)
- [ ] Dados buscados via `getServerSession()` + query Prisma do saldo
- [ ] Badge estilizado com fundo destacado (âmbar/dourado), texto legível
- [ ] Se créditos = 0, badge muda de cor (vermelho/laranja) como alerta visual
- [ ] Badge atualiza automaticamente após compra de créditos (via revalidação de sessão)

**Test:** Usuário com 50 créditos vê "🌟 50 créditos". Ajustar créditos no banco para 0 → badge muda de cor.

---

### AC3: Dark Theme Aplicado Globalmente

- [ ] Tailwind configurado com paleta solar customizada em `tailwind.config.ts`:
  - `solar-amber`: `#FFBF00` (primário)
  - `solar-gold`: `#FFD700` (secundário)
  - `solar-dark`: `#1A1A1A` (fundo escuro)
  - `solar-darker`: `#0F0F0F` (fundo mais escuro)
  - `solar-light`: `#F5F5DC` (texto claro, off-white)
- [ ] CSS global em `globals.css` aplica dark mode como padrão:
  - `body { background: solar-dark; color: solar-light; }`
- [ ] Componentes de formulário (input, button) têm estilos dark-friendly
- [ ] Contraste WCAG AA validado (4.5:1 para texto normal)

**Test:** Abrir qualquer página autenticada → fundo escuro, texto claro, paleta solar aplicada.

---

### AC4: Link para Compra de Créditos

- [ ] Link "Comprar créditos" no header
- [ ] Redireciona para `/credits/buy` (página será implementada no Epic 3)
- [ ] Por ora, `/credits/buy` pode ser uma página placeholder: "Em breve - Compra de créditos"
- [ ] Link estilizado com cor de destaque (solar-amber), hover com feedback visual

**Test:** Clicar em "Comprar créditos" → redireciona para `/credits/buy` (placeholder).

---

### AC5: Logout Funcional no Header

- [ ] Botão de logout já existe (criado na Story 1.3)
- [ ] Integrado ao header do `AppLayout`
- [ ] Estilizado consistentemente com o dark theme
- [ ] Ao clicar, chama `signOut()` e redireciona para `/login`

**Test:** Clicar em "Sair" no header → sessão encerrada, redirecionado para login.

---

### AC6: Páginas Públicas Sem Header

- [ ] Páginas públicas (`/login`, `/register`, `/`) não exibem o header com créditos
- [ ] Apenas páginas autenticadas (`/dashboard`, `/chat`, etc.) usam `AppLayout`
- [ ] Páginas públicas mantêm dark theme mas com layout simplificado

**Test:** Acessar `/login` → sem header. Fazer login e ir para `/dashboard` → header visível.

---

## Technical Implementation Notes

### Tailwind Config Structure

**Arquivo:** `apps/web/tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'solar-amber': '#FFBF00',
        'solar-gold': '#FFD700',
        'solar-dark': '#1A1A1A',
        'solar-darker': '#0F0F0F',
        'solar-light': '#F5F5DC',
      },
    },
  },
  plugins: [],
};

export default config;
```

### AppLayout Component Structure

**Arquivo:** `apps/web/src/components/layout/AppLayout.tsx`

```typescript
import { auth } from '@/lib/auth';
import { prisma } from '@sol/db';
import Link from 'next/link';
import LogoutButton from '../LogoutButton';
import CreditsBadge from './CreditsBadge';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session) {
    return <>{children}</>;
  }

  // Buscar créditos atualizados do banco
  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { credits: true },
  });

  return (
    <div className="min-h-screen bg-solar-dark">
      <header className="h-16 bg-solar-darker shadow-lg border-b border-solar-amber/20">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <Link href="/dashboard" className="text-2xl font-bold text-solar-amber hover:text-solar-gold transition-colors">
            ☀️ SOL
          </Link>

          <div className="flex items-center space-x-4">
            <CreditsBadge credits={user?.credits || 0} />
            <Link
              href="/credits/buy"
              className="text-sm text-solar-light hover:text-solar-amber transition-colors"
            >
              Comprar créditos
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
```

### CreditsBadge Component

**Arquivo:** `apps/web/src/components/layout/CreditsBadge.tsx`

```typescript
'use client';

export default function CreditsBadge({ credits }: { credits: number }) {
  const isLow = credits === 0;

  return (
    <div
      className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
        isLow
          ? 'bg-red-500/20 text-red-400 border border-red-500/50'
          : 'bg-solar-amber/20 text-solar-amber border border-solar-amber/50'
      }`}
    >
      🌟 {credits} {credits === 1 ? 'crédito' : 'créditos'}
    </div>
  );
}
```

### Globals CSS Update

**Arquivo:** `apps/web/src/app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-solar-dark text-solar-light;
  }

  h1, h2, h3, h4, h5, h6 {
    @apply text-solar-light;
  }

  a {
    @apply text-solar-amber hover:text-solar-gold transition-colors;
  }
}
```

---

## Dependencies

- **Blocked by:** Story 1.3 (Autenticação deve estar funcional para buscar sessão)
- **Blocks:** Story 2.1 (Chat Core depende deste layout para exibir interface consistente)

---

## Testing Checklist

- [ ] Header visível em `/dashboard` com todos os elementos
- [ ] Badge de créditos exibe valor correto do banco
- [ ] Badge muda de cor quando créditos = 0
- [ ] Link "Comprar créditos" redireciona para `/credits/buy`
- [ ] Botão de logout funciona corretamente
- [ ] Dark theme aplicado (fundo escuro, texto claro, paleta solar)
- [ ] Contraste WCAG AA validado
- [ ] Layout responsivo em mobile (<768px)
- [ ] Páginas públicas (`/login`, `/register`) sem header
- [ ] `pnpm run typecheck` passa sem erros

---

## Definition of Done

- [ ] Todos os ACs validados manualmente
- [ ] `AppLayout` implementado e aplicado em rotas autenticadas
- [ ] Badge de créditos funcional e estilizado
- [ ] Dark theme com paleta solar aplicado globalmente
- [ ] Link de compra de créditos funcional (placeholder)
- [ ] Logout integrado ao header
- [ ] Code review aprovado
- [ ] Nenhum erro de TypeScript (strict mode)
- [ ] Responsividade testada em mobile

---

## References

- **PRD:** [docs/prd.md](../../prd.md) — UI Design Goals, Story 1.4
- **Tailwind Dark Mode Docs:** https://tailwindcss.com/docs/dark-mode
- **WCAG Contrast Guidelines:** https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html

---

## Notes for Developers

Esta story estabelece a identidade visual do SOL. A paleta solar (tons quentes sobre fundo escuro) deve criar uma sensação premium e diferenciada. O badge de créditos é o elemento mais importante do header — deve estar sempre visível e atualizado. Atenção especial ao contraste de cores para garantir acessibilidade WCAG AA.

**Próxima Story:** Epic 2, Story 2.1 — Chat Interface & Streaming
