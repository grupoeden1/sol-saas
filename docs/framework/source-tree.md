# Source Tree — SOL (Eden Corporate)

> Estrutura oficial de pastas do projeto SOL.
> Agentes devem criar arquivos respeitando esta estrutura.

---

## Estrutura Raiz

```
sol-saas/
├── apps/
│   └── web/                    # Aplicação Next.js principal
├── packages/
│   └── db/                     # Pacote Prisma compartilhado
│       ├── prisma/
│       │   └── schema.prisma   # Schema do banco de dados
│       └── src/
│           └── index.ts        # Exporta cliente Prisma
├── docs/                       # Documentação do projeto
│   ├── framework/
│   │   ├── tech-stack.md
│   │   ├── coding-standards.md
│   │   └── source-tree.md
│   ├── stories/                # User stories do AIOS
│   │   └── backlog/
│   ├── prd.md                  # Product Requirements Document
│   └── architecture.md        # Documento de arquitetura
├── .env                        # Variáveis de ambiente (não commitado)
├── .env.example                # Template de variáveis (commitado)
├── docker-compose.yml          # PostgreSQL + Redis local
├── turbo.json                  # Configuração Turborepo
└── package.json                # Root package.json
```

## Aplicação Web (apps/web/)

```
apps/web/
├── app/
│   ├── (auth)/                 # Rotas públicas de autenticação
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── cadastro/
│   │       └── page.tsx
│   ├── (dashboard)/            # Rotas protegidas
│   │   ├── layout.tsx          # Layout com verificação de sessão
│   │   ├── chat/
│   │   │   └── page.tsx        # Tela principal do SOL
│   │   └── conta/
│   │       └── page.tsx        # Configurações e créditos
│   ├── api/                    # API Routes (backend)
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts    # NextAuth handler
│   │   ├── chat/
│   │   │   └── route.ts        # Endpoint de chat com OpenAI
│   │   ├── credits/
│   │   │   └── route.ts        # Consulta de créditos
│   │   └── webhooks/
│   │       └── stripe/
│   │           └── route.ts    # Webhook de pagamento Stripe
│   ├── layout.tsx              # Layout raiz
│   └── page.tsx                # Landing page / redirect
├── components/
│   ├── ui/                     # Componentes Shadcn/UI base
│   ├── chat/                   # Componentes do chat
│   │   ├── chat-input.tsx
│   │   ├── chat-message.tsx
│   │   └── chat-window.tsx
│   └── layout/                 # Componentes de layout
│       ├── header.tsx
│       └── sidebar.tsx
├── lib/
│   ├── auth.ts                 # Configuração NextAuth
│   ├── db.ts                   # Cliente Prisma singleton
│   ├── openai.ts               # Cliente OpenAI
│   ├── stripe.ts               # Cliente Stripe
│   └── utils.ts                # Utilitários gerais
├── types/
│   └── index.ts                # Tipos globais
├── public/                     # Assets estáticos
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

## Schema do Banco (packages/db/prisma/schema.prisma)

Modelos obrigatórios para o MVP do SOL:
- `User` — usuário autenticado
- `Account` — contas OAuth do NextAuth
- `Session` — sessões do NextAuth
- `ChatMessage` — histórico de mensagens
- `CreditBalance` — saldo de créditos do usuário
- `Subscription` — assinatura Stripe do usuário

## Regras de Localização

- Lógica de negócio → `app/api/`
- Componentes reutilizáveis → `components/`
- Configurações de serviços externos → `lib/`
- Tipos TypeScript → `types/`
- Nunca criar lógica de negócio dentro de componentes React
