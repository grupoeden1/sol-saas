# Tech Stack — SOL (Eden Corporate)

> Este documento é carregado automaticamente por todos os agentes do AIOS.
> Qualquer decisão técnica deve seguir este stack. Desvios exigem justificativa explícita.

## Princípio Central

Zero lock-in. Todo o stack deve poder ser migrado ou substituído sem parar a operação.
A única exceção aceita são provedores de IA (OpenAI) e gateway de pagamento (Stripe),
por não existirem alternativas equivalentes self-hosted no estágio atual.

---

## Stack Definitivo

### Frontend
- **Framework:** Next.js 14 com App Router
- **Linguagem:** TypeScript (strict mode — sem `any`)
- **Estilo:** Tailwind CSS
- **Componentes:** Shadcn/UI (customizável, sem lock-in)
- **Streaming IA:** Vercel AI SDK (apenas a biblioteca, não a plataforma)

### Backend
- **Abordagem:** API Routes dentro do próprio Next.js
- **Sem servidor separado** — toda a lógica de negócio fica em `app/api/`
- **ORM:** Prisma com PostgreSQL

### Banco de Dados
- **Principal:** PostgreSQL (self-hosted via Docker)
- **ORM:** Prisma
- **Migrations:** via `prisma migrate dev` e `prisma migrate deploy`
- **Proibido:** SQLite em produção, MongoDB, qualquer DBaaS com lock-in

### Autenticação
- **Biblioteca:** NextAuth.js v5
- **Providers:** Email/senha (Credentials) como padrão inicial
- **Sessão:** JWT armazenado em cookie httpOnly
- **Proibido:** Supabase Auth, Clerk, Auth0, Firebase Auth

### Pagamentos
- **Gateway:** Stripe
- **Métodos:** Cartão de crédito + PIX
- **Integração:** Stripe Checkout + Webhooks
- **Créditos:** Lógica de consumo implementada no banco, não no Stripe

### Inteligência Artificial
- **Provider principal:** OpenAI (GPT-4o para outputs finais, GPT-4o-mini para iterações)
- **SDK:** openai (npm oficial)
- **Streaming:** Server-Sent Events via API Routes
- **Proibido:** Kestra, n8n, ou qualquer orquestrador externo — lógica em código puro

### Infraestrutura
- **Hospedagem:** VPS própria
- **Containerização:** Docker + Docker Compose
- **CI/CD:** GitHub Actions
- **Proibido:** Vercel (produção), Railway, Render, qualquer PaaS com lock-in

### Monorepo
- **Gerenciador:** Turborepo
- **Estrutura:** `apps/web` (Next.js) + `packages/db` (Prisma)

---

## Regras para os Agentes

1. Nunca sugerir Supabase, Kestra, Firebase, Vercel (produção) ou qualquer BaaS
2. Sempre gerar TypeScript strict — sem `any`, sem `as unknown`
3. Toda lógica de negócio fica no backend (API Routes), nunca exposta no frontend
4. Migrations do banco sempre via Prisma, nunca SQL manual
5. Variáveis de ambiente sensíveis nunca no código — sempre em `.env`
6. Este stack vale para SOL, LUA, MARTE, VÊNUS e todos os produtos futuros da Eden Corporate
