# SOL Product Requirements Document (PRD)

## Goals and Background Context

### Goals

- Permitir que alunos do Space (Eden Corporate) criem ofertas de infoprodutos diferenciadas sem depender de mentoria individual
- Permitir que alunos gerem scripts de criativos para anúncios digitais de forma rápida via chat com IA
- Reduzir a saturação no leilão de anúncios causada por alunos vendendo o mesmo produto com os mesmos criativos
- Escalar a entrega de valor que hoje só acontece via mentoria 1:1 (R$100k já vendidos) em formato SaaS
- Aumentar margem do negócio ao transformar consultoria em produto recorrente
- Que cada aluno consiga criar e testar uma nova oferta em **menos de 30 minutos** usando o SOL

### Background Context

O Space, programa de educação em marketing digital da Eden Corporate, ensina centenas de alunos a vender a mesma categoria de infoprodutos (ex: Pilates na Parede) usando as mesmas estruturas de oferta e criativos. À medida que a base de alunos cresce, esse padrão gera saturação no leilão de anúncios — alunos competem entre si com criatividades idênticas, elevando CPM e reduzindo conversão. A única saída hoje é a mentoria individual, que não escala.

O SOL é um SaaS conversacional com IA que resolve esse gargalo diretamente: via chat, o aluno descreve seu produto, público e contexto, e a IA gera uma oferta ou script de criativo completamente novo e personalizado. Como produto de upsell do Space, o SOL já chega com contexto de mercado estabelecido, base de clientes aquecida e validação de demanda (R$100k+ em mentorias vendidas). O MVP foca em velocidade de entrega: chat funcional, autenticação segura, sistema de créditos e pagamento integrado.

### Change Log

| Date       | Version | Description       | Author      |
| ---------- | ------- | ----------------- | ----------- |
| 2026-02-24 | 1.0     | Initial PRD draft | Morgan (PM) |

---

## Requirements

### Functional

- **FR1:** O sistema deve permitir que usuários se cadastrem e façam login com email e senha via NextAuth.js v5 (Credentials Provider)
- **FR2:** O sistema deve manter sessão autenticada via JWT em cookie httpOnly
- **FR3:** O usuário autenticado deve ter acesso a um chat conversacional com IA para geração de ofertas e scripts de criativos
- **FR4:** O chat deve enviar mensagens para a API da OpenAI (GPT-4o para outputs finais, GPT-4o-mini para iterações) e retornar respostas via streaming (Server-Sent Events)
- **FR5:** O sistema deve descontar créditos do saldo do usuário a cada mensagem enviada ao chat
- **FR6:** O usuário deve ser bloqueado de enviar novas mensagens quando seu saldo de créditos for zero
- **FR7:** O usuário deve poder visualizar seu saldo atual de créditos no painel do usuário
- **FR8:** O sistema deve permitir a compra de pacotes de créditos via Stripe Checkout (cartão e PIX)
- **FR9:** O sistema deve processar webhooks do Stripe para confirmar pagamentos e creditar o saldo do usuário no banco de dados
- **FR10:** O usuário deve ter acesso a um painel básico com: saldo de créditos, histórico de compras e histórico de conversas

### Non Functional

- **NFR1:** A stack deve seguir arquitetura zero lock-in — Next.js 14 + Prisma + PostgreSQL + Docker, sem uso de Supabase, Firebase, Vercel (produção) ou qualquer BaaS
- **NFR2:** Todo código deve ser TypeScript strict mode — sem `any`, sem `as unknown`
- **NFR3:** O tempo de resposta da primeira palavra via streaming do chat não deve exceder 3 segundos em condições normais de rede
- **NFR4:** A lógica de consumo de créditos deve ser implementada no banco (PostgreSQL + Prisma), nunca no Stripe
- **NFR5:** Toda lógica de negócio (deducção de créditos, processamento de webhooks) deve ficar em API Routes do Next.js, nunca exposta no frontend
- **NFR6:** Variáveis sensíveis (chaves OpenAI, Stripe, NextAuth secret) nunca devem aparecer no código — sempre em `.env`
- **NFR7:** O sistema deve ser deployável via Docker Compose em VPS própria
- **NFR8:** O MVP deve suportar operação com até 200 usuários ativos concorrentes sem degradação perceptível

---

## User Interface Design Goals

### Overall UX Vision

Interface minimalista e focada na tarefa: o aluno entra, digita o contexto do seu produto, e em segundos recebe uma oferta ou script pronto. Sem fricção, sem onboarding longo. A experiência deve parecer "conversar com um mentor especialista", não "usar um software". Visual limpo, dark mode como padrão por sensação premium, texto legível e resposta em streaming visível ao vivo.

### Key Interaction Paradigms

- **Chat-first:** tela principal é a conversa — sem menus laterais complexos, sem dashboards densos
- **Streaming visível:** resposta da IA aparece token a token, dando sensação de resposta ao vivo
- **Saldo sempre visível:** badge de créditos no header em todas as telas, nunca escondido
- **Zero fricção no MVP:** sem wizards, sem steps guiados — o aluno digita e recebe

### Core Screens and Views

1. **Login / Cadastro** — tela simples com email + senha, sem OAuth no MVP
2. **Chat Principal** — tela full-height com histórico de mensagens e input fixo no rodapé. Tela mais importante do produto.
3. **Prompt inline de créditos insuficientes** — ao tentar enviar com saldo zero, aparece prompt inline no chat (não modal, não página separada) com CTA direto para compra de créditos
4. **Painel do Usuário** — saldo de créditos, histórico de compras de créditos, histórico de conversas (lista)
5. **Compra de Créditos** — listagem de pacotes disponíveis → redirect para Stripe Checkout
6. **Sucesso/Erro de Pagamento** — páginas de retorno após o checkout do Stripe

### Accessibility

**WCAG AA** — contraste adequado, navegação por teclado funcional, labels semânticos nos inputs.

### Branding

Paleta solar: tons quentes sobre fundo escuro (âmbar, dourado, off-white). Tipografia moderna (Inter ou Geist). Dark mode como padrão confirmado. Branding guide detalhado a ser definido pelo agente de UX.

### Target Device and Platforms

**Web Responsive** — desktop como uso primário (aluno estruturando criativos no computador), com suporte adequado a mobile para consultas rápidas.

---

## Technical Assumptions

### Repository Structure: Monorepo

Turborepo com estrutura:

```
apps/web          → Next.js 14 (frontend + API Routes)
packages/db       → Prisma schema, client e migrations
```

### Service Architecture

**Monolith dentro do Monorepo** — sem microsserviços no MVP.

- Toda lógica de negócio em `apps/web/app/api/` (Next.js API Routes)
- Banco de dados: PostgreSQL self-hosted via Docker
- Sem servidor separado, sem BFF, sem filas de mensagem no MVP
- Sem orquestradores externos (Kestra, n8n) — lógica de IA em código puro

### Testing Requirements

**Unit + Integration** para o MVP:

- **Unit:** funções de cálculo de créditos, parsing de respostas, validações
- **Integration:** fluxo de webhook do Stripe, fluxo de chat com mock da OpenAI
- **E2E:** fora do escopo do MVP
- **Manual:** flows críticos (login → chat → compra de créditos) validados em staging antes de cada deploy

### Additional Technical Assumptions

- **Autenticação:** NextAuth.js v5, Credentials Provider (email + senha), JWT em cookie httpOnly. Sem OAuth, sem magic links no MVP.
- **Pagamentos:** Stripe Checkout + Webhooks. PIX + cartão. Lógica de créditos 100% no PostgreSQL (`credit_transactions`), nunca no Stripe.
- **IA:** OpenAI GPT-4o para outputs finais, GPT-4o-mini para iterações intermediárias. Streaming via Server-Sent Events (não WebSockets).
- **Infraestrutura:** VPS própria, Docker Compose, GitHub Actions para CI/CD. Proibido: Vercel produção, Railway, Render.
- **Idioma do código:** TypeScript strict mode. Sem `any`. Sem `as unknown`.
- **Variáveis sensíveis:** sempre em `.env`, nunca hardcodadas.

---

## Epic List

| Epic | Title                 | Goal                                                                                                                                                                          |
| ---- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Foundation & Auth     | Estabelecer infraestrutura (Turborepo, Docker, PostgreSQL, CI/CD) e autenticação completa (NextAuth.js v5). Entrega: produto deployado com login funcional.                   |
| 2    | Chat Core com IA      | Implementar chat com streaming OpenAI, persistência de histórico e estado inline de créditos insuficientes. Entrega: aluno pode conversar com a IA e receber ofertas ao vivo. |
| 3    | Créditos & Pagamentos | Implementar sistema de créditos, Stripe Checkout + PIX/cartão, webhooks e painel do usuário. Entrega: SOL monetizado, ciclo de valor fechado.                                 |

---

## Epic 1: Foundation & Auth

> Estabelecer o Turborepo com Next.js 14, Prisma + PostgreSQL dockerizado, CI/CD via GitHub Actions e sistema de autenticação completo com NextAuth.js v5. Ao final deste epic, o produto está deployado em VPS com login/cadastro funcional — base sólida e testável para todos os epics seguintes.

### Story 1.1 — Project Bootstrap & Infrastructure

As a developer,
I want the monorepo, Docker environment and CI/CD pipeline set up,
so that the team has a working foundation to build features on.

**Acceptance Criteria:**

1. Turborepo configurado com `apps/web` (Next.js 14, TypeScript strict) e `packages/db` (Prisma)
2. `docker-compose.yml` funcional sobe PostgreSQL localmente com `docker compose up`
3. Prisma conecta ao PostgreSQL e `prisma migrate dev` roda sem erros
4. GitHub Actions executa lint + typecheck + testes a cada PR para `main`
5. `.env.example` documenta todas as variáveis necessárias (sem valores reais)
6. `README.md` contém instruções claras de setup local (clone → .env → docker up → migrate → dev)

### Story 1.2 — Database Schema: Users & Sessions

As a developer,
I want the core database schema for users,
so that authentication can be implemented against a properly structured database.

**Acceptance Criteria:**

1. Migration Prisma cria tabela `users` com campos: `id`, `email` (unique), `password_hash`, `credits` (int, default 0), `created_at`, `updated_at`
2. Migration cria tabela `sessions` compatível com NextAuth.js v5
3. `prisma generate` não produz erros e o Prisma Client tipado está disponível em `packages/db`
4. Seed script cria um usuário de teste para desenvolvimento local

### Story 1.3 — Authentication: Register & Login

As a student,
I want to create an account and log in with email and password,
so that I can access the SOL platform securely.

**Acceptance Criteria:**

1. Rota `POST /api/auth/register` cria usuário com senha hasheada (bcrypt, min 10 rounds), retorna erro 409 se email já existe
2. NextAuth.js v5 configurado com Credentials Provider — valida email + senha contra o banco
3. Login bem-sucedido cria sessão JWT em cookie httpOnly com expiração de 7 dias
4. Páginas `/login` e `/register` com formulários validados (email format, senha min 8 chars)
5. Rotas protegidas redirecionam para `/login` se não autenticado
6. Logout encerra a sessão e redireciona para `/login`
7. Mensagens de erro não revelam se o email existe (segurança)

### Story 1.4 — Layout Shell & Dark Theme

As a student,
I want a consistent dark-themed layout with my credit balance always visible,
so that I always know my usage context.

**Acceptance Criteria:**

1. Layout global com header contendo: logo/wordmark "SOL", badge de créditos do usuário logado, link para comprar créditos, botão de logout
2. Dark theme aplicado globalmente via Tailwind + Shadcn/UI (fundo escuro, tipografia clara, paleta solar como accent)
3. Badge de créditos exibe o saldo atual do usuário autenticado, buscado via session
4. Layout é responsivo — funciona em mobile (≥ 375px) e desktop
5. Componente de layout é compartilhado por todas as páginas autenticadas

### Story 1.5 — CI/CD Pipeline & Documentation

As a developer,
I want the CI/CD pipeline and project documentation to be complete and updated,
so that the project is maintainable and ready for collaborative development.

**Acceptance Criteria:**

1. `.github/workflows/ci.yml` configurado com `pnpm`, Node 20 e PostgreSQL 17-alpine
2. Pipeline executa com sucesso os jobs de `lint`, `typecheck` e `build`
3. Variáveis de ambiente de teste configuradas no GitHub Actions para permitir o build
4. `README.md` atualizado com o novo guia de setup (pnpm, geração de secret, docker)
5. Todos os links de documentação em `docs/` e `README.md` funcionam corretamente

---

## Epic 2: Chat Core com IA

> Implementar a experiência central do SOL: interface de chat com streaming de respostas da OpenAI (GPT-4o/4o-mini), persistência do histórico de conversas no banco, e estado inline de créditos insuficientes. Ao final deste epic, o aluno autenticado pode conversar com a IA e receber ofertas/criativos ao vivo.

### Story 2.1 — Database Schema: Conversations & Messages

As a developer,
I want the database schema for conversations and messages,
so that chat history can be persisted and retrieved.

**Acceptance Criteria:**

1. Migration Prisma cria tabela `conversations` com: `id`, `user_id` (FK → users), `title` (gerado da 1ª mensagem, max 60 chars), `created_at`
2. Migration cria tabela `messages` com: `id`, `conversation_id` (FK), `role` (enum: `user` | `assistant`), `content` (text), `created_at`
3. Relações Prisma corretamente tipadas — `user.conversations`, `conversation.messages`
4. Query de carregamento do histórico ordena mensagens por `created_at ASC`

### Story 2.2 — Chat UI: Interface e Histórico

As a student,
I want a full-screen chat interface that displays my conversation history,
so that I can read and continue my interactions naturally.

**Acceptance Criteria:**

1. Página `/chat` (protegida) exibe área de mensagens com scroll automático para a última mensagem
2. Mensagens do usuário e da IA visualmente diferenciadas (alinhamento, cor de fundo)
3. Input fixo no rodapé com botão de envio e atalho `Enter` para enviar (`Shift+Enter` pula linha)
4. Sidebar ou dropdown lista conversas anteriores do usuário — clicar carrega a conversa
5. Botão "Nova Conversa" no header cria nova conversa e limpa o chat
6. Loading state visível enquanto aguarda primeira palavra do streaming

### Story 2.3 — OpenAI Integration com Streaming

As a student,
I want to receive AI-generated offers and creative scripts as they are written,
so that the response feels immediate and alive.

**Acceptance Criteria:**

1. `POST /api/chat` aceita `{ conversationId, message }`, valida autenticação
2. Rota seleciona modelo: GPT-4o-mini para iterações, GPT-4o para outputs finais (lógica documentada em comentário)
3. Resposta enviada via Server-Sent Events (SSE) — tokens chegam ao cliente em tempo real
4. System prompt inclui contexto de produto (SOL é especialista em criação de ofertas de infoprodutos)
5. Mensagem do usuário e resposta completa da IA persistidas no banco ao final do stream
6. Erros da API OpenAI (rate limit, timeout) retornam mensagem amigável no chat

### Story 2.4 — Estado Inline de Créditos Insuficientes

As a student with no credits,
I want to see a clear inline prompt when I try to send a message,
so that I know exactly what to do to continue using SOL.

**Acceptance Criteria:**

1. Ao tentar enviar mensagem com saldo zero, `POST /api/chat` retorna `402 Payment Required`
2. Frontend exibe prompt inline no chat (não modal, não nova página): "Você ficou sem créditos. [Comprar créditos →]"
3. Link "Comprar créditos" redireciona para `/credits`
4. Badge de créditos no header atualiza em tempo real após cada mensagem enviada com sucesso (via header `X-Credits-Remaining`)
5. Input do chat é desabilitado visualmente enquanto o saldo é zero

---

## Epic 3: Créditos & Pagamentos

> Implementar o sistema de créditos (deducção por uso, saldo em tempo real) e a integração completa com Stripe — pacotes de créditos, Checkout, PIX/cartão, webhooks e painel do usuário. Ao final deste epic, o SOL está monetizado e o ciclo completo de valor está fechado.

### Story 3.1 — Database Schema: Credits & Transactions

As a developer,
I want the credit and transaction schema,
so that all credit movements are auditable and consistent.

**Acceptance Criteria:**

1. Migration Prisma cria tabela `credit_transactions` com: `id`, `user_id` (FK), `amount` (int, positivo = crédito, negativo = débito), `type` (enum: `purchase` | `consumption`), `description`, `stripe_payment_id` (nullable, unique), `created_at`
2. Coluna `credits` na tabela `users` representa saldo atual — atualizada via transação atômica junto com insert em `credit_transactions`
3. Funções utilitárias em `packages/db`: `deductCredits(userId, amount)` e `addCredits(userId, amount, stripePaymentId)` com rollback em caso de saldo insuficiente
4. Saldo nunca vai abaixo de zero — constraint no banco + validação na função

### Story 3.2 — Deducção de Crédito no Chat

As a product owner,
I want credits to be deducted automatically when a student sends a message,
so that usage is metered correctly.

**Acceptance Criteria:**

1. `POST /api/chat` verifica saldo do usuário **antes** de chamar a OpenAI — retorna `402` se saldo = 0
2. Após resposta completa do stream, deduz 1 crédito via `deductCredits()` em transação atômica
3. Se a chamada OpenAI falhar, nenhum crédito é deductado
4. Header `X-Credits-Remaining` retornado em toda resposta de chat — frontend atualiza badge sem re-fetch
5. Logs de consumo registrados em `credit_transactions` com `type: consumption`

### Story 3.3 — Pacotes de Créditos & Stripe Checkout

As a student,
I want to choose a credit package and be redirected to a secure payment page,
so that I can buy credits easily.

**Acceptance Criteria:**

1. Página `/credits` lista pacotes disponíveis (ex: 50, 150, 500 créditos) — valores configuráveis via `.env` ou seed
2. `POST /api/payments/checkout` cria sessão Stripe Checkout com o pacote selecionado, retorna `sessionUrl`
3. Frontend redireciona para `sessionUrl` do Stripe
4. Stripe Checkout configurado para aceitar cartão de crédito e PIX
5. Página `/credits/success` exibe confirmação amigável pós-pagamento
6. Página `/credits/error` exibe mensagem de erro com link para tentar novamente

### Story 3.4 — Stripe Webhook: Processamento de Pagamentos

As a product owner,
I want successful payments to automatically add credits to the student's account,
so that the purchase flow is seamless and reliable.

**Acceptance Criteria:**

1. `POST /api/webhooks/stripe` valida assinatura do webhook com `STRIPE_WEBHOOK_SECRET`
2. Evento `checkout.session.completed` dispara `addCredits(userId, amount, stripePaymentId)` em transação atômica
3. Idempotência garantida — `stripe_payment_id` tem constraint unique, duplo disparo não duplica créditos
4. Endpoint retorna `200` rapidamente (processamento síncrono, sem filas no MVP)
5. Falhas logadas com `stripe_payment_id` para reprocessamento manual se necessário

### Story 3.5 — Painel do Usuário

As a student,
I want a dashboard showing my credits, purchase history and conversation history,
so that I can track my usage and manage my account.

**Acceptance Criteria:**

1. Página `/dashboard` exibe: saldo atual de créditos, lista de `credit_transactions` com tipo, valor e data (paginada, 20/página), lista de conversas com título e data (link para reabrir no chat)
2. Dados carregados via Server Components do Next.js 14
3. Link "Comprar mais créditos" em destaque quando saldo < 10
4. Layout consistente com o shell definido no Epic 1

---

## Checklist Results Report

### Category Statuses

| Category                         | Status  | Notes                                                                                                          |
| -------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| 1. Problem Definition & Context  | ✅ PASS | Problema claro (saturação leilão), audiência específica (alunos Space), métrica de sucesso mensurável (<30min) |
| 2. MVP Scope Definition          | ✅ PASS | In/out of scope explícitos, foco correto em chat + auth + créditos + pagamento                                 |
| 3. User Experience Requirements  | ✅ PASS | Flows primários documentados, telas definidas, estado de erro (inline) especificado                            |
| 4. Functional Requirements       | ✅ PASS | FR1–FR10 testáveis, cobrindo todos os flows do MVP                                                             |
| 5. Non-Functional Requirements   | ✅ PASS | Performance (3s streaming), segurança (JWT, bcrypt), infra (Docker, VPS), zeroing lock-in                      |
| 6. Epic & Story Structure        | ✅ PASS | 3 epics sequenciais, 13 stories dimensionadas para sessão de agente, ACs testáveis                             |
| 7. Technical Guidance            | ✅ PASS | Stack completo definido em tech-stack.md, arquitetura monolith justificada, restrições explícitas              |
| 8. Cross-Functional Requirements | ✅ PASS | Schema definido por story, integração Stripe com idempotência, deploy via Docker                               |
| 9. Clarity & Communication       | ✅ PASS | Documento estruturado, terminologia consistente, changelog incluído                                            |

**Completeness:** ~95% | **MVP Scope:** Just Right | **Readiness:** ✅ READY FOR ARCHITECT

### Gaps Identificados (LOW priority)

- Persona formal do usuário (aluno Space) não documentada — informação existe no contexto mas não em seção própria
- Política de retenção de dados não especificada (conversas antigas)
- Monitoring/alerting pós-deploy não coberto no MVP (aceitável)

---

## Next Steps

### UX Expert Prompt

> @ux — Com base no PRD do SOL (`docs/prd.md`), crie o design system e especificações de UI. Diretrizes: dark mode, paleta solar (âmbar/dourado sobre fundo escuro), Shadcn/UI + Tailwind, chat-first. Telas prioritárias: Chat Principal (FR3/FR4), Prompt inline de créditos insuficientes (FR6), Layout Shell com badge de créditos. Use `*create-doc` com o template de UI spec.

### Architect Prompt

> @architect — Com base no PRD do SOL (`docs/prd.md`), crie o documento de arquitetura. Stack definido em `docs/framework/tech-stack.md`: Next.js 14 + TypeScript strict + Prisma + PostgreSQL + NextAuth v5 + Stripe + OpenAI + Docker + Turborepo. Arquitetura monolith em API Routes. Foque em: estrutura de pastas do monorepo, schema Prisma completo (users, sessions, conversations, messages, credit_transactions), fluxo de streaming SSE, estratégia de webhook idempotente. Use `*create-doc` com o template de arquitetura.
