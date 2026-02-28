# Source Tree — SOL (Eden Corporate)

> Estrutura oficial de pastas do projeto SOL.
> Agentes devem criar arquivos respeitando esta estrutura.
> Última atualização: 2026-02-28

---

## Estrutura Raiz

```
sol-saas/
├── apps/
│   └── web/                        # Aplicação Next.js 14 (App Router)
├── packages/
│   └── db/                         # Pacote Prisma compartilhado (@sol/db)
├── docs/                           # Documentação do projeto
│   ├── framework/                  # Padrões técnicos
│   │   ├── tech-stack.md
│   │   ├── coding-standards.md
│   │   └── source-tree.md          # ESTE ARQUIVO
│   ├── audit/                      # Relatórios de auditoria de qualidade
│   ├── stories/                    # User stories por epic
│   │   ├── epic-1/ .. epic-4/
│   │   └── backlog/tech-debt.md
│   ├── workflows/                  # Workflows AIOS (quality-audit, story, code-review)
│   ├── prd.md                      # Product Requirements Document
│   ├── architecture.md             # Documento de arquitetura
│   └── front-end-spec.md           # Especificação de frontend/design
├── squads/                         # Definições de agentes AIOS
│   ├── .antigravity/rules/agents/  # Agentes framework (genéricos)
│   └── sol-squad/                  # Agentes específicos do projeto SOL
├── .aios/workflows/                # Workflows AIOS executáveis
├── .github/workflows/ci.yml        # GitHub Actions CI
├── .env                            # Variáveis de ambiente (não commitado)
├── .env.example                    # Template de variáveis (commitado)
├── docker-compose.yml              # PostgreSQL local
├── turbo.json                      # Configuração Turborepo
├── pnpm-workspace.yaml             # Workspaces pnpm
└── package.json                    # Root package.json
```

## Aplicação Web (apps/web/)

```
apps/web/
├── src/
│   ├── app/                            # App Router (rotas diretas, sem route groups)
│   │   ├── layout.tsx                  # Layout raiz (html, body, fonts)
│   │   ├── page.tsx                    # Landing page / redirect
│   │   ├── globals.css                 # Tailwind base + tema dark
│   │   │
│   │   ├── login/                      # Autenticação
│   │   │   ├── page.tsx                # Tela de login
│   │   │   └── actions.ts             # Server action de login
│   │   ├── register/
│   │   │   └── page.tsx                # Tela de cadastro
│   │   │
│   │   ├── dashboard/                  # Dashboard do usuário
│   │   │   ├── layout.tsx              # Wrapper com AppLayout
│   │   │   └── page.tsx                # Saldo, transações, conversas
│   │   ├── chat/                       # Chat com IA
│   │   │   ├── layout.tsx              # Wrapper com AppLayout
│   │   │   └── page.tsx                # Chat principal (SSE streaming)
│   │   ├── credits/                    # Gestão de créditos
│   │   │   ├── layout.tsx              # Wrapper com AppLayout
│   │   │   ├── buy/
│   │   │   │   ├── page.tsx            # Pacotes de créditos
│   │   │   │   └── components/
│   │   │   │       └── BuyButton.tsx   # Botão de compra Stripe
│   │   │   ├── success/page.tsx        # Pós-pagamento sucesso
│   │   │   └── error/page.tsx          # Pós-pagamento erro
│   │   ├── admin/
│   │   │   └── page.tsx                # Console admin (layout próprio, sem AppLayout)
│   │   │
│   │   └── api/                        # API Routes (backend)
│   │       ├── auth/
│   │       │   ├── [...nextauth]/
│   │       │   │   └── route.ts        # NextAuth handler (GET + POST)
│   │       │   └── register/
│   │       │       └── route.ts        # Registro de novo usuário
│   │       ├── chat/
│   │       │   └── route.ts            # Chat OpenAI (SSE streaming, multipart com anexos)
│   │       ├── conversations/
│   │       │   ├── route.ts            # Lista conversas do usuário
│   │       │   └── [conversationId]/
│   │       │       └── messages/
│   │       │           └── route.ts    # Mensagens de uma conversa
│   │       ├── payments/
│   │       │   └── checkout/
│   │       │       └── route.ts        # Cria Stripe Checkout Session
│   │       ├── admin/
│   │       │   └── add-credits/
│   │       │       └── route.ts        # Ajuste manual de créditos (ADMIN)
│   │       └── webhooks/
│   │           └── stripe/
│   │               └── route.ts        # Webhook Stripe (checkout.session.completed)
│   │
│   ├── components/
│   │   ├── Logo.tsx                    # Logo SVG inline (ícone)
│   │   ├── LogoWithText.tsx            # Logo SVG inline (com texto)
│   │   ├── LogoutButton.tsx            # Botão de logout
│   │   ├── LottieLogo.tsx             # Logo animado (Lottie)
│   │   │
│   │   ├── admin/                      # Componentes do admin
│   │   │   ├── AddCreditsForm.tsx      # Form de ajuste de créditos
│   │   │   ├── MetricCard.tsx          # Card de métrica (contadores)
│   │   │   └── UsersTable.tsx          # Tabela de usuários paginada
│   │   │
│   │   ├── dashboard/                  # Componentes do dashboard
│   │   │   ├── ConversationList.tsx    # Lista de conversas
│   │   │   ├── CreditSummary.tsx       # Resumo de saldo
│   │   │   ├── Pagination.tsx          # Paginação reutilizável
│   │   │   └── TransactionHistory.tsx  # Histórico de transações
│   │   │
│   │   └── layout/                     # Componentes de layout
│   │       ├── AppLayout.tsx           # Layout principal (header flutuante pill)
│   │       ├── CreditsBadge.tsx        # Badge de saldo no header
│   │       └── CreditsProvider.tsx     # Context provider de créditos
│   │
│   ├── lib/
│   │   ├── auth.ts                     # Configuração NextAuth v5 (JWT, Credentials)
│   │   ├── credits-config.ts           # Constantes: pacotes de créditos, percentuais
│   │   ├── file-processor.ts           # Extração de texto: PDF, DOCX, imagens (OCR)
│   │   ├── format-balance.ts           # Formatação de saldo (centavos → R$)
│   │   ├── prompts.ts                  # System prompts da IA
│   │   └── stripe.ts                   # Cliente Stripe (singleton)
│   │
│   ├── types/
│   │   └── next-auth.d.ts              # Ambient declaration: Session.user.id, .role
│   │
│   ├── assets/
│   │   └── Camada 1Logotipo.json       # Animação Lottie do logo
│   │
│   └── middleware.ts                   # NextAuth middleware (proteção de rotas)
│
├── public/                             # Assets estáticos (vazio após cleanup)
├── next.config.mjs                     # Config Next.js (CSP, transpile @sol/db)
├── tailwind.config.ts                  # Tailwind v3 (cores hex, tema solar)
├── postcss.config.mjs                  # PostCSS (Tailwind + Autoprefixer)
├── tsconfig.json                       # TypeScript config
├── .eslintrc.json                      # ESLint (next/core-web-vitals + strict)
└── package.json                        # Dependências da aplicação
```

## Pacote de Banco de Dados (packages/db/)

```
packages/db/
├── prisma/
│   ├── schema.prisma                   # Schema do banco de dados
│   ├── seed.ts                         # Seed: admin user + dados iniciais
│   └── migrations/                     # 7 migrations aplicadas
│       ├── 20260225045419_init/
│       ├── 20260225193516_add_credits_non_negative_constraint/
│       ├── 20260226220000_pricing_refactoring/
│       ├── 20260227040156_add_user_role/
│       ├── 20260227180000_remove_min_balance_add_max_tokens/
│       ├── 20260228024918_add_attachment_fields/
│       └── 20260228120000_admin_console/
├── src/
│   ├── index.ts                        # Prisma Client singleton + barrel exports
│   ├── admin.ts                        # getUsersList, getAdminMetrics, addCreditsAdmin
│   ├── conversations.ts                # createConversation, getConversations, addMessage
│   ├── credits.ts                      # addCredits, deductCredits, InsufficientBalanceError
│   ├── exchange-rate.ts                # getExchangeRate (USD-BRL, lazy cache, fallbacks)
│   └── token-counter.ts               # countTokens, estimateMaxCost, calculateRealCost, calculateImageCost
├── package.json
└── tsconfig.json
```

### Modelos do Schema (prisma/schema.prisma)

- `User` — usuário autenticado (email, passwordHash, role, balanceCents)
- `Session` — sessões JWT do NextAuth
- `Conversation` — conversa do chat (title, userId)
- `Message` — mensagem individual (role, content, tokens, costCents, attachments)
- `CreditTransaction` — registro de movimentação financeira (purchase, deduction, adjustment)
- `ExchangeRate` — cache de cotação USD-BRL

### Enums

- `Role` — `USER | ADMIN`
- `MessageRole` — `user | assistant | system`
- `TransactionType` — `purchase | deduction | adjustment`

## Regras de Localização

| Tipo de código | Local correto | Exemplo |
|---|---|---|
| Lógica de negócio (dados) | `packages/db/src/` | Créditos, cotação, tokens, conversas |
| Lógica de negócio (orchestração) | `apps/web/src/app/api/` | Validação de request, chamadas OpenAI, SSE |
| Componentes reutilizáveis | `components/` por feature | `admin/`, `dashboard/`, `layout/` |
| Configurações de serviços | `lib/` | Auth, Stripe, prompts, file-processor |
| Tipos TypeScript | `types/` | Ambient declarations (.d.ts) |
| Constantes de negócio | `lib/credits-config.ts` | Pacotes de créditos, percentuais |
| Formatação de exibição | `lib/format-balance.ts` | Centavos → R$ formatado |
| Assets estáticos | `src/assets/` (bundled) ou `public/` (servidos) | Lottie JSON, SVGs |

### Regras importantes

- **Nunca** criar lógica de negócio dentro de componentes React
- **Nunca** importar Prisma Client diretamente — usar `@sol/db` ou `@sol/db/token-counter`
- **Componentes de feature** ficam em `components/{feature}/` (ex: `admin/`, `dashboard/`)
- **Componentes globais** ficam na raiz de `components/` (ex: `Logo.tsx`, `LogoutButton.tsx`)
- **Layouts por seção** usam `AppLayout` via `{section}/layout.tsx` — exceto `/admin` que tem layout próprio

## Débito Técnico Estrutural

> Items que divergem da estrutura ideal. Rastreados em `docs/stories/backlog/tech-debt.md`.

- `chat/page.tsx` (813 linhas) — componentização pendente em `components/chat/`
- OpenAI client inline em `api/chat/route.ts` — extração para `lib/openai.ts` pendente
