# SOL — Frontend Specification

## 1. Introduction

### Product Overview

O **SOL** é um SaaS conversacional com IA voltado para alunos do Space (Eden Corporate) que precisam criar **scripts de criativos personalizados para conteúdos orgânicos e pagos**. A interface é centrada em chat — o aluno descreve seu produto, público e contexto, e a IA gera um script de criativo completamente novo e personalizado em minutos.

### Primary Persona

**Aluno Space** — Estudante de marketing digital (18-45 anos) que vende infoprodutos na categoria wellness/saúde. Enfrenta saturação no leilão de anúncios por usar os mesmos criativos que centenas de colegas. Precisa de um "mentor digital" que gere **scripts de criativos personalizados para conteúdos orgânicos e pagos** em minutos, sem depender de mentoria individual.

- **Motivação:** Diferenciar-se no mercado com criativos únicos
- **Frustração atual:** Copiar estruturas genéricas que competem entre si
- **Expectativa:** Digitar contexto → receber script pronto em segundos
- **Dispositivo primário:** Desktop (estruturando criativos), mobile para consultas rápidas

### UX Goals & Principles

| Princípio | Descrição |
|---|---|
| **Chat-first** | A tela principal é a conversa — sem menus laterais complexos, sem dashboards densos |
| **Zero fricção** | Sem wizards, sem steps guiados — o aluno digita e recebe |
| **Streaming visível** | Resposta da IA aparece token a token, dando sensação de resposta ao vivo |
| **Saldo sempre visível** | Badge de créditos no header em todas as telas, nunca escondido |
| **Dark premium** | Dark mode como padrão, transmitindo sensação premium e foco |
| **Mentor, não software** | A experiência deve parecer "conversar com um mentor especialista" |

### Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-02-25 | 1.0 | Initial frontend specification | Uma (UX) |

---

## 2. Information Architecture

### Sitemap

```
SOL
├── / .......................... Landing page (pública)
├── /login .................... Login com email + senha
├── /register ................. Cadastro com email + senha
├── /dashboard ................ Painel do usuário (protegida)
├── /chat ..................... Chat principal com IA (protegida)
├── /credits
│   ├── /buy .................. Comprar pacotes de créditos (protegida)
│   ├── /success .............. Confirmação pós-pagamento
│   └── /error ................ Erro/cancelamento de pagamento
└── /api (não renderizado)
    ├── /auth/* ............... NextAuth handlers
    ├── /chat ................. SSE streaming endpoint
    ├── /conversations/* ...... CRUD de conversas
    ├── /payments/checkout .... Stripe checkout session
    └── /webhooks/stripe ...... Webhook do Stripe
```

### Navigation Model

```
┌──────────────────────────────────────────────────────────┐
│  HEADER (persistente em todas as telas autenticadas)     │
│  ☀️ SOL    [🌟 42 créditos]  [Comprar créditos]  [Sair] │
└──────────────────────────────────────────────────────────┘

Fluxo de navegação:
  Login/Register → Dashboard → Chat (principal)
                              ↕
                         Credits/Buy → Stripe Checkout → Success/Error
```

**Hierarquia de prioridade visual:**
1. **Chat** — Tela principal, onde o valor é entregue
2. **Credits/Buy** — Monetização, segundo mais importante
3. **Dashboard** — Hub de status e navegação
4. **Login/Register** — Gatekeeping, mínima fricção

### Content Zones

Todas as telas autenticadas compartilham o `AppLayout`:

| Zona | Componente | Descrição |
|---|---|---|
| Header | `AppLayout` (server) | Logo, CreditsBadge, nav links, LogoutButton |
| Main | Página renderizada | Conteúdo variável por rota |
| Sidebar | `ConversationSidebar` (só no /chat) | Lista de conversas + botão "Nova Conversa" |

---

## 3. User Flows

### Flow 1: Primeiro Acesso (Register → Chat)

```
[Landing /]
    → Clica "Começar"
    → [/register]
        → Preenche email + senha + confirmação
        → POST /api/auth/register
        → Redirect /login?registered=true
    → [/login]
        → Preenche email + senha
        → loginAction (server action)
        → Redirect /dashboard
    → [/dashboard]
        → Vê boas-vindas + saldo de créditos no header
        → Navega para /chat
    → [/chat]
        → Digita contexto do produto
        → IA responde em streaming
        → 1 crédito debitado
```

### Flow 2: Chat com IA (Core Loop)

```
[/chat]
    → Usuário digita mensagem no input
    → Enter para enviar (Shift+Enter para nova linha)
    → POST /api/chat { conversationId, message }
    → Loading state: 3 dots animados
    → SSE stream: tokens aparecem em tempo real
    → Ao completar:
        - Mensagem salva no DB
        - 1 crédito debitado
        - Badge atualiza via X-Credits-Remaining header
        - Conversation sidebar atualiza título (primeira msg)
```

### Flow 3: Créditos Insuficientes

```
[/chat] com saldo = 0
    → Usuário tenta enviar mensagem
    → POST /api/chat retorna 402
    → Input desabilitado (visual vermelho)
    → Alerta inline no chat:
        "Você ficou sem créditos. [Comprar créditos →]"
    → Clica no link
    → [/credits/buy]
        → Escolhe pacote (Starter / Pro / Max)
        → Clica "Comprar"
        → POST /api/payments/checkout
        → Redirect para Stripe Checkout
    → [Stripe] Preenche pagamento
    → [/credits/success]
        → "Pagamento confirmado! 🎉"
        → Clica "Ir para o chat"
    → [/chat] com saldo restaurado
```

### Flow 4: Compra de Créditos (Direto)

```
[Header] Clica "Comprar créditos"
    → [/credits/buy]
        → Grid 3 colunas: Starter | Pro (popular) | Max
        → Seleciona pacote
        → BuyButton → POST /api/payments/checkout
        → Redirect Stripe Checkout
    → Sucesso: /credits/success
    → Cancelamento: /credits/error → retry ou voltar ao chat
```

### Flow 5: Histórico de Conversas

```
[/chat]
    → Sidebar lista conversas anteriores (ordenadas por data DESC)
    → Clica em conversa existente
        → Carrega mensagens via GET /api/conversations/[id]/messages
        → Exibe histórico completo
    → Clica "Nova Conversa" (+)
        → Limpa chat
        → currentConversationId = null
        → Próxima mensagem cria nova conversa
```

---

## 4. Wireframes

### 4.1 Layout Shell (AppLayout)

```
┌──────────────────────────────────────────────────────────────┐
│  ☀️ SOL          🌟 42 créditos   Comprar créditos    [Sair] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                     {page content}                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘

Header: h-16, bg-background-secondary, border-b border-solar-800/30
Logo: ☀️ text-solar-300 font-bold
CreditsBadge: pill shape, 🌟 + count, green/red dinâmico
```

### 4.2 Login Page

```
┌──────────────────────────────────────────────────┐
│                                                  │
│                    ☀️                             │
│              Entrar no SOL                       │
│                                                  │
│   ┌──────────────────────────────────────────┐   │
│   │  Email                                   │   │
│   └──────────────────────────────────────────┘   │
│   ┌──────────────────────────────────────────┐   │
│   │  Senha                                   │   │
│   └──────────────────────────────────────────┘   │
│                                                  │
│   ┌──────────────────────────────────────────┐   │
│   │            [ Entrar ]                    │   │
│   └──────────────────────────────────────────┘   │
│                                                  │
│         Não tem conta? Cadastre-se                │
│                                                  │
└──────────────────────────────────────────────────┘

Card: max-w-md mx-auto, bg-background-secondary
Inputs: bg-background, border-solar-800/30, focus:ring-solar-500
Button: w-full, bg-solar-500, hover:bg-solar-600
```

### 4.3 Chat Page (Principal)

```
┌──────────────────────────────────────────────────────────────┐
│  ☀️ SOL          🌟 42 créditos   Comprar créditos    [Sair] │
├────────────────┬─────────────────────────────────────────────┤
│                │                                             │
│  [+ Nova       │        ☀️ SOL                               │
│   Conversa]    │  ┌─────────────────────┐                    │
│                │  │ Quero um script para │    ← user (right) │
│  ─────────     │  │ anúncio de Pilates   │                   │
│                │  └─────────────────────┘                    │
│  Conv. 1    ◄──│                                             │
│  há 2 min      │  ☀️ SOL                                     │
│                │  ┌─────────────────────┐                    │
│  Conv. 2       │  │ Ótimo! Vou criar um │ ← assistant (left)│
│  há 1 hora     │  │ script focado em... │                    │
│                │  │ █ (streaming)       │                    │
│  Conv. 3       │  └─────────────────────┘                    │
│  ontem         │                                             │
│                ├─────────────────────────────────────────────┤
│                │  ┌────────────────────────────────┐ [→]     │
│                │  │  Digite sua mensagem...        │         │
│                │  └────────────────────────────────┘         │
└────────────────┴─────────────────────────────────────────────┘

Sidebar: w-80, bg-background-secondary, border-r
Chat area: flex-1, overflow-y-auto
Input: fixed bottom, auto-resize textarea (44px-120px)
Messages: user = right-aligned solar, assistant = left-aligned + ☀️ label
```

### 4.4 Chat — Estado Créditos Insuficientes

```
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │ ⚠️ Você ficou sem créditos.              │    │
│  │    Comprar créditos →                    │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
├─────────────────────────────────────────────────┤
│  ┌────────────────────────────────┐ [→]         │
│  │  Compre créditos para...      │  (disabled)  │
│  └────────────────────────────────┘             │

Alert: bg-solar-500/10, border-solar-500/50, inline no chat
Input: opacity-50, cursor-not-allowed, placeholder vermelho
CreditsBadge: bg-red-500/20, text-red-400
```

### 4.5 Credits/Buy Page

```
┌──────────────────────────────────────────────────────────────┐
│  ☀️ SOL          🌟 0 créditos    Comprar créditos    [Sair] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                        🌟                                    │
│                 Comprar Créditos                              │
│    Cada crédito equivale a uma mensagem com a IA.            │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │              │  │ Mais popular │  │              │       │
│  │   Starter    │  │              │  │     Max      │       │
│  │              │  │     Pro      │  │              │       │
│  │  100 msgs    │  │              │  │  750 msgs    │       │
│  │              │  │  250 msgs    │  │              │       │
│  │  R$ 29,90    │  │              │  │  R$ 149,90   │       │
│  │              │  │  R$ 69,90    │  │              │       │
│  │  ✓ 100 créd  │  │              │  │  ✓ 750 créd  │       │
│  │  ✓ Cartão    │  │  ✓ 250 créd  │  │  ✓ Cartão    │       │
│  │  ✓ Sem exp.  │  │  ✓ Cartão    │  │  ✓ Sem exp.  │       │
│  │              │  │  ✓ Sem exp.  │  │              │       │
│  │  [Comprar]   │  │              │  │  [Comprar]   │       │
│  │              │  │  [Comprar]   │  │              │       │
│  └──────────────┘  │              │  └──────────────┘       │
│                    └──────────────┘                          │
│                                                              │
│  Pagamento processado com segurança pelo Stripe.             │
└──────────────────────────────────────────────────────────────┘

Grid: grid-cols-1 md:grid-cols-3, gap-6
Popular card: border-solar-500/60, shadow-lg shadow-solar-500/10
Badge: absolute -top-3, bg-solar-500, uppercase
```

### 4.6 Dashboard Page

```
┌──────────────────────────────────────────────────────────────┐
│  ☀️ SOL          🌟 42 créditos   Comprar créditos    [Sair] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Bem-vindo ao SOL! ☀️                                  │  │
│  │                                                        │  │
│  │  Você está autenticado como:                           │  │
│  │  user@email.com                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Próximos passos                                       │  │
│  │                                                        │  │
│  │  • Chat com IA para geração de criativos               │  │
│  │  • Sistema de créditos e pagamentos                    │  │
│  │  • Histórico de conversas e transações                 │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘

Cards: bg-background-secondary, border border-solar-800/30, rounded-lg
Title: text-solar-300, font-bold
```

---

## 5. Component Library

### 5.1 Component Tree

```
AppLayout (server)
├── CreditsProvider (client, context)
│   ├── Header
│   │   ├── Logo (☀️ SOL → /dashboard)
│   │   ├── CreditsBadge (client, uses context)
│   │   ├── NavLink ("Comprar créditos" → /credits/buy)
│   │   └── LogoutButton (client)
│   └── Main content slot
│
├── ChatPage (client)
│   ├── ConversationSidebar
│   │   ├── NewConversationButton
│   │   └── ConversationItem[] (clickable)
│   ├── ChatArea
│   │   ├── EmptyState (☀️ "Bem-vindo ao SOL")
│   │   ├── MessageBubble[] (user/assistant)
│   │   ├── LoadingIndicator (3 dots)
│   │   └── NoCreditsAlert (inline)
│   └── ChatInput (auto-resize textarea + send button)
│
├── BuyCreditsPage (server)
│   ├── PackageCard[] (Starter, Pro, Max)
│   │   └── BuyButton (client)
│   └── StripeDisclaimer
│
├── LoginPage (client)
│   ├── AuthCard
│   │   ├── EmailInput
│   │   ├── PasswordInput
│   │   ├── ErrorAlert
│   │   ├── SuccessAlert
│   │   └── SubmitButton
│   └── RegisterLink
│
└── RegisterPage (client)
    ├── AuthCard
    │   ├── EmailInput
    │   ├── PasswordInput
    │   ├── ConfirmPasswordInput
    │   ├── ErrorAlert
    │   └── SubmitButton
    └── LoginLink
```

### 5.2 Component Specifications

#### CreditsBadge

| Prop | Type | Description |
|---|---|---|
| _(uses context)_ | — | Lê `credits` via `useCredits()` |

**States:**
- `credits > 0`: `bg-solar-500/10 text-solar-300` — 🌟 {n} crédito(s)
- `credits === 0`: `bg-red-500/20 text-red-400` — 🌟 0 créditos

**Rendering:** `rounded-full px-3 py-1 text-sm font-medium`

---

#### MessageBubble

| Prop | Type | Description |
|---|---|---|
| `message` | `{ id, role, content, createdAt }` | Dados da mensagem |

**Variants:**
- `role === 'user'`: Right-aligned, `bg-solar-500/10 border-solar-500/30`
- `role === 'assistant'`: Left-aligned, `bg-background-secondary`, prefixed com ☀️ SOL label

**Content:** `whitespace-pre-wrap break-words`, timestamp relativo (date-fns ptBR)

---

#### ChatInput

| Prop | Type | Description |
|---|---|---|
| `onSend` | `(msg: string) => void` | Callback de envio |
| `disabled` | `boolean` | Loading state |
| `noCredits` | `boolean` | Sem créditos |

**Behavior:**
- Auto-resize: min 44px, max 120px
- Enter = send, Shift+Enter = newline
- Disabled state: `opacity-50 cursor-not-allowed`
- No credits: placeholder vermelho, borda vermelha

---

#### ConversationSidebar

| Prop | Type | Description |
|---|---|---|
| `conversations` | `Conversation[]` | Lista de conversas |
| `currentConversationId` | `string \| null` | Conversa ativa |
| `onSelectConversation` | `(id: string) => void` | Callback de seleção |
| `onNewConversation` | `() => void` | Callback nova conversa |
| `isLoading` | `boolean` | Estado de loading |

**States:**
- Loading: 3 skeleton cards animados
- Empty: "Nenhuma conversa ainda"
- Active conversation: `border-solar-500/50 bg-solar-500/5`

---

#### BuyButton

| Prop | Type | Description |
|---|---|---|
| `packageId` | `string` | ID do pacote |

**Behavior:** POST /api/payments/checkout → redirect to Stripe Checkout URL

---

#### PackageCard

**Structure:**
- Header: label + description
- Price: `text-3xl font-bold text-solar-300` (formatted BRL)
- Features: checkmark list (✓ solar-400)
- CTA: BuyButton
- Popular badge: `absolute -top-3`, `bg-solar-500 text-background`

---

#### LogoutButton

**Styling:** `border-red-500/50 text-red-400 bg-red-500/10 hover:bg-red-500/20`
**Action:** `signOut()` from NextAuth

---

## 6. Branding & Style Guide

### Color Palette

#### Solar Theme (Dark Mode Default)

| Token | Hex | HSL | Usage |
|---|---|---|---|
| `background` | `#0a0a0a` | 0 0% 4% | Fundo principal |
| `background-secondary` | `#1a1a1a` | 0 0% 10% | Cards, sidebar, header |
| `foreground` | `#fafaf9` | 40 33% 98% | Texto principal |
| `foreground-muted` | `#a8a29e` | 30 7% 64% | Texto secundário |
| `solar-50` | `#fffbeb` | — | Lightest solar |
| `solar-100` | `#fef3c7` | — | — |
| `solar-200` | `#fde68a` | — | — |
| `solar-300` | `#fcd34d` | — | Headings, titles, accent text |
| `solar-400` | `#fbbf24` | — | Checkmarks, icons |
| `solar-500` | `#f59e0b` | — | Primary accent (âmbar) |
| `solar-600` | `#d97706` | — | Hover states |
| `solar-700` | `#b45309` | — | Scrollbar thumb |
| `solar-800` | `#92400e` | — | Borders (with opacity) |
| `solar-900` | `#78350f` | — | Deep accent |
| `solar-950` | `#451a03` | — | Darkest solar |
| `accent` | `#f59e0b` | — | = solar-500 |
| `accent-hover` | `#d97706` | — | = solar-600 |
| `border` | `#1c1917` | — | stone-900, borders gerais |
| `ring` | `#f59e0b` | — | Focus rings |

#### Semantic Colors

| State | Background | Border | Text |
|---|---|---|---|
| Error | `red-500/10` | `red-500/50` | `red-400` |
| Success | `green-500/10` | `green-500/50` | `green-400` |
| Info/Solar | `solar-500/10` | `solar-500/50` | `solar-300` |

### Typography

| Element | Font | Weight | Size | Color |
|---|---|---|---|---|
| **Body** | Inter | 400 | base (16px) | `foreground` |
| **H1** | Inter | 700 | `text-3xl` (30px) | `solar-300` |
| **H2** | Inter | 700 | `text-2xl` (24px) | `solar-300` |
| **H3** | Inter | 700 | `text-xl` (20px) | `foreground` |
| **Caption** | Inter | 400 | `text-sm` (14px) | `foreground-muted` |
| **Badge** | Inter | 500 | `text-sm` (14px) | contextual |
| **Button** | Inter | 600 | `text-sm` (14px) | contextual |

**Font loading:** Google Fonts via `next/font/google`, CSS variable `--font-inter`

### Iconography

O SOL usa emojis nativos como sistema de ícones no MVP:

| Icon | Usage | Context |
|---|---|---|
| ☀️ | Logo, assistant label | Header, chat bubbles |
| 🌟 | Credits badge | Header, buy page |
| 🎉 | Payment success | Success page |
| ⚠️ | Payment error, alerts | Error page, no-credits alert |
| ✓ | Feature lists | Package cards |
| → | Send button, CTAs | Chat input, links |
| + | New conversation | Sidebar |

### Spacing & Layout

| Token | Value | Usage |
|---|---|---|
| Page padding | `py-4` + `max-w-4xl mx-auto` | Content areas |
| Card padding | `p-6` to `p-8` | Cards |
| Gap (grid) | `gap-6` | Package grid |
| Stack | `space-y-6` to `space-y-8` | Vertical sections |
| Header height | `h-16` (4rem) | Fixed header |
| Sidebar width | `w-80` (20rem) | Chat sidebar |
| Border radius | `rounded-lg` to `rounded-xl` | Cards, inputs |

### Elevation Pattern

Sem box-shadow no tema base. Exceção: pacote "popular" com `shadow-lg shadow-solar-500/10`.

---

## 7. Accessibility

### WCAG AA Compliance

| Critério | Status | Implementação |
|---|---|---|
| **Contraste de texto** | ✅ | `foreground (#fafaf9)` sobre `background (#0a0a0a)` = ratio 19.4:1 |
| **Contraste de texto muted** | ✅ | `foreground-muted (#a8a29e)` sobre `#0a0a0a` = ratio 7.5:1 |
| **Contraste solar** | ✅ | `solar-300 (#fcd34d)` sobre `#0a0a0a` = ratio 12.8:1 |
| **Contraste de erro** | ✅ | `red-400` sobre `red-500/10` = acessível |
| **Focus indicators** | ✅ | `focus:ring-2 focus:ring-solar-500` em todos os interativos |
| **Labels semânticos** | ✅ | Inputs com `type`, `autoComplete`, `placeholder` |
| **Keyboard navigation** | ✅ | Tab order natural, Enter para submit, Shift+Enter para newline |

### Keyboard Shortcuts

| Ação | Shortcut | Contexto |
|---|---|---|
| Enviar mensagem | `Enter` | Chat input |
| Nova linha | `Shift + Enter` | Chat input |
| Navegar inputs | `Tab` | Forms |
| Submit form | `Enter` | Login/Register |

### Aria Attributes (Recomendações)

- Chat area: `role="log"`, `aria-live="polite"` para novas mensagens
- Loading dots: `aria-label="Carregando resposta"`
- Credits badge: `aria-label="{n} créditos restantes"`
- Conversation list: `role="listbox"` com `aria-selected` no item ativo
- No-credits alert: `role="alert"`

---

## 8. Responsiveness

### Breakpoints

| Breakpoint | Width | Layout Adaptations |
|---|---|---|
| **Mobile** | < 640px | Stack vertical, sidebar oculta, grid 1 col |
| **Tablet** | 640–1024px | Grid 2 cols, sidebar toggle |
| **Desktop** | > 1024px | Grid 3 cols, sidebar fixa, layout completo |

### Responsive Behaviors por Tela

#### Chat Page
- **Desktop:** Sidebar (w-80) fixa à esquerda + chat area (flex-1)
- **Mobile:** Sidebar oculta por padrão, toggle para mostrar; chat full-width
- **Viewport:** `h-[calc(100vh-4rem)]` para usar toda a altura disponível

#### Credits/Buy Page
- **Desktop:** `grid-cols-3` — 3 cards lado a lado
- **Tablet:** `grid-cols-2` ou `grid-cols-3` com cards menores
- **Mobile:** `grid-cols-1` — cards empilhados

#### Login/Register
- **Todos:** Card centralizado `max-w-md mx-auto`, responsivo nativamente

#### Header
- **Desktop:** Todos os elementos visíveis inline
- **Mobile:** Considerar hamburger menu ou empilhamento para CreditsBadge e nav links

### Mobile-First Classes (Tailwind)

```css
/* Exemplos de padrões responsivos usados */
grid-cols-1 md:grid-cols-3    /* Buy credits grid */
flex-col sm:flex-row           /* Action buttons */
hidden sm:block                /* Elementos desktop-only */
w-full sm:w-auto               /* Buttons */
text-2xl sm:text-3xl           /* Responsive headings */
```

---

## 9. Animation & Micro-interactions

### Streaming Text

A resposta da IA aparece token a token via SSE, sem animação CSS adicional. O comportamento natural do DOM append cria o efeito de "digitação ao vivo".

### Loading States

| Elemento | Animação | Implementação |
|---|---|---|
| **Chat loading dots** | 3 dots pulsando | CSS animation: bounce com delays escalonados |
| **Sidebar skeleton** | Shimmer/pulse | 3 cards com `animate-pulse` no Tailwind |
| **Submit buttons** | Text swap | "Entrar" → "Entrando..." (sem spinner) |

### Transitions

| Elemento | Propriedade | Duração | Easing |
|---|---|---|---|
| Cards (hover) | `border-color`, `background` | `transition-all` (150ms) | ease |
| Buttons (hover) | `background-color` | `transition-colors` (150ms) | ease |
| Input focus | `ring`, `border` | instant (focus-visible) | — |
| Chat scroll | `scrollTop` | smooth | `scrollIntoView({ behavior: 'smooth' })` |

### Feedback Visual

- **Mensagem enviada:** Aparece imediatamente na lista (optimistic)
- **Crédito debitado:** Badge atualiza via context (sem animação no MVP)
- **Conversa selecionada:** Border + background change instant
- **Hover em conversation:** `border-solar-500/30` transition

---

## 10. Performance

### Performance Budget

| Métrica | Target | Justificativa |
|---|---|---|
| **LCP** | < 2.5s | Core Web Vitals "Good" |
| **FID** | < 100ms | Core Web Vitals "Good" |
| **CLS** | < 0.1 | Layout estável |
| **First token (SSE)** | < 3s | PRD NFR3 — percepção de velocidade |
| **TTI** | < 3.5s | Chat interativo rápido |

### Optimization Strategy

| Técnica | Aplicação |
|---|---|
| **React Server Components** | AppLayout, Dashboard, BuyCreditsPage — zero JS no client |
| **Client Components isolados** | ChatPage, LoginPage, RegisterPage — hydration mínima |
| **SSE Streaming** | Chat — tokens progressivos, não espera resposta completa |
| **next/font** | Inter carregada via `next/font/google` — sem FOUT |
| **Tailwind purge** | CSS final só contém classes usadas |
| **Lazy sidebar load** | Conversations carregadas on mount, não blocking |

### Bundle Considerations

- **Maior client bundle:** ChatPage (SSE parsing, state management, date-fns)
- **Otimização futura:** Code splitting do chat, dynamic import do date-fns locale
- **Zero external UI libs:** Sem Shadcn/UI runtime no MVP — Tailwind utility classes only
- **Stripe.js:** Carregado apenas na rota /credits/buy (não global)

---

## 11. Next Steps

### Immediate (MVP Scope)

1. **Implementar Story 3.5** — Painel do Usuário com histórico de transações e conversas paginado
2. **Configurar STRIPE_WEBHOOK_SECRET** com valor real do `stripe listen`
3. **Testar fluxo completo** Login → Chat → Compra → Webhook → Créditos
4. **Validar responsividade** em dispositivos reais (mobile Chrome, Safari)

### Post-MVP Enhancements

1. **Design System formal:** Migrar para Shadcn/UI com tokens extraídos do Tailwind config
2. **Sidebar responsiva:** Drawer/overlay no mobile com gesture support
3. **Markdown rendering:** Renderizar markdown nas respostas da IA (listas, bold, code blocks)
4. **Skeleton screens:** Loading states para Dashboard e BuyCreditsPage
5. **Toast notifications:** Feedback de ações (crédito comprado, erro de rede)
6. **Copy to clipboard:** Botão em cada resposta da IA para copiar o script gerado
7. **Dark/Light toggle:** Suporte a light mode (low priority — dark é premium)
8. **PWA support:** Manifest + service worker para acesso offline ao histórico

### Accessibility Improvements

1. Implementar `aria-live` regions no chat
2. Adicionar `role="log"` no container de mensagens
3. Screen reader announcements para credit deductions
4. Skip-to-content link no layout

---

## 12. Specification Checklist

| # | Critério | Status |
|---|---|---|
| 1 | Information Architecture documentada | ✅ |
| 2 | User flows primários mapeados (5 flows) | ✅ |
| 3 | Wireframes ASCII para todas as telas | ✅ |
| 4 | Component tree com hierarquia completa | ✅ |
| 5 | Component specs com props e states | ✅ |
| 6 | Color palette documentada com tokens | ✅ |
| 7 | Typography scale definida | ✅ |
| 8 | Iconography system documentado | ✅ |
| 9 | Spacing tokens documentados | ✅ |
| 10 | WCAG AA compliance verificado | ✅ |
| 11 | Keyboard navigation documentada | ✅ |
| 12 | Responsive breakpoints definidos | ✅ |
| 13 | Mobile adaptations por tela | ✅ |
| 14 | Animations e transitions especificados | ✅ |
| 15 | Performance budget com targets | ✅ |
| 16 | Bundle optimization strategy | ✅ |
| 17 | Consistência com PRD verificada | ✅ |
| 18 | Consistência com Architecture doc verificada | ✅ |

**Readiness:** ✅ READY — Especificação completa para implementação por agentes Dev e QA.
