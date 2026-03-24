# Tech Stack — SOL (Eden Corporate)

> Este documento é carregado automaticamente por todos os agentes do AIOS.
> Qualquer decisão técnica deve seguir este stack. Desvios exigem justificativa explícita.
> Última atualização: 2026-03-06

## Princípio Central

Zero lock-in. Todo o stack deve poder ser migrado ou substituído sem parar a operação.
Exceções aceitas: provedores de IA e gateway de pagamento (Stripe),
por não existirem alternativas equivalentes self-hosted no estágio atual.

---

## Stack Definitivo

### Frontend
- **Framework:** Next.js 14 com App Router
- **Linguagem:** TypeScript (strict mode — sem `any`)
- **Estilo:** Tailwind CSS v3
- **Componentes:** Shadcn/UI (customizável, sem lock-in)
- **Streaming IA:** SSE nativo via adaptadores em `lib/ai/`

### Backend
- **Abordagem:** API Routes dentro do próprio Next.js (`app/api/`)
- **Sem servidor separado** — toda a lógica de negócio fica em API Routes
- **ORM:** Prisma com PostgreSQL
- **Rate Limiting:** In-memory por IP/key (`lib/rate-limit.ts`)

### Banco de Dados
- **Principal:** PostgreSQL (self-hosted via Docker)
- **ORM:** Prisma
- **Migrations:** via `prisma migrate dev` e `prisma migrate deploy`
- **Vector DB:** Qdrant (self-hosted via Docker) — embeddings para Knowledge Base / RAG
- **Proibido:** SQLite em produção, MongoDB, qualquer DBaaS com lock-in

### Autenticação
- **Biblioteca:** NextAuth.js v5
- **Providers:** Email/senha (Credentials) como padrão
- **Sessão:** JWT armazenado em cookie httpOnly (maxAge: 7 dias)
- **Middleware:** `src/middleware.ts` protege rotas (dashboard, credits, onboarding, quiz, roteiros, admin)
- **Admin:** Role-based — `ADMIN` role verificado no middleware e em cada API Route
- **Proibido:** Supabase Auth, Clerk, Auth0, Firebase Auth

### Pagamentos
- **Gateway:** Stripe
- **Métodos:** Cartão de crédito + PIX
- **Integração:** Stripe Checkout + Webhooks + One-Click Purchase (saved cards)
- **Assinaturas:** Stripe Subscriptions com créditos mensais automáticos
- **Créditos:** Lógica de consumo/dedução implementada no banco (atômica, `WHERE credits >= N`)

### Inteligência Artificial
- **Arquitetura:** Provider-agnostic via `AiAdapter` interface (`lib/ai/types.ts`)
- **Providers suportados:**
  - Anthropic Claude API (`@anthropic-ai/sdk`) — provider padrão
  - OpenAI API (`openai`) — provider alternativo, configurável pelo admin
- **Configuração dinâmica:** Admin pode trocar provider/modelo via `AppConfig` sem deploy
- **Modelos padrão Anthropic:** `claude-sonnet-4-5-20250929` (geração), `claude-haiku-4-5-20251001` (classificação)
- **Streaming:** SSE via adapters (`anthropicAdapter.stream()` / `openaiAdapter.stream()`)
- **Vision:** Nativo no Claude Sonnet e GPT-4o (source type `base64`)
- **Contagem de tokens:** Retornada pela API (`usage.input_tokens`, `usage.output_tokens`)

### Prompt Engine
- **Localização:** `lib/prompt-engine/` — orquestrador de 3 camadas
- **Layer 1:** Base fixa por combinação de path (AD/ORGANIC × MODELED/FROM_SCRATCH)
- **Layer 2:** Módulos contextuais selecionados por `MarketClassification` (awareness + sophistication)
- **Layer 3:** Biblioteca de padrões por nicho
- **Overrides:** Admin pode sobrescrever qualquer prompt via `PricingConfig` (textValue) + UI em `/admin/prompts`
- **Expert Profile:** Injetado automaticamente quando o usuário opta por personalização

### Knowledge Base / RAG
- **Vector DB:** Qdrant (self-hosted)
- **Embeddings:** OpenAI `text-embedding-3-small` via `lib/knowledge/embeddings.ts`
- **Pipeline:** Upload → Chunking → Embedding → Qdrant → Retrieval no chat
- **Documentos:** PDF, DOCX, TXT, Vídeo (transcrição → chunks)
- **Admin:** Gerenciamento de coleções e documentos em `/admin/knowledge`

### Text-to-Speech
- **Provider:** ElevenLabs
- **SDK:** `@elevenlabs/elevenlabs-js`
- **Modelo:** `eleven_multilingual_v2` (suporte português)
- **Cache:** `TtsAudioCache` no DB — áudio reutilizado por messageId+voiceId
- **Pricing:** Configurável via `CREDITS_PER_K_ELEVENLABS_CHARS` (default 26 créditos/1K chars)

### Análise de Vídeo
- **Transcrição:** AssemblyAI (`assemblyai` SDK)
- **Frames:** FFmpeg (extração de frames-chave)
- **Análise visual:** IA (Anthropic/OpenAI) com vision sobre frames extraídos
- **Pricing:** Configurável via `CREDITS_PER_MIN_ASSEMBLYAI` (default passthrough)

### Infraestrutura
- **Hospedagem:** VPS própria
- **Containerização:** Docker + Docker Compose
- **CI/CD:** GitHub Actions
- **Proibido:** Vercel (produção), Railway, Render, qualquer PaaS com lock-in

### Monorepo
- **Gerenciador:** Turborepo + pnpm workspaces
- **Estrutura:** `apps/web` (Next.js) + `packages/db` (Prisma — `@sol/db`)

---

## Regras para os Agentes

1. Nunca sugerir Supabase, Kestra, Firebase, Vercel (produção) ou qualquer BaaS
2. Sempre gerar TypeScript strict — sem `any`, sem `as unknown`
3. Toda lógica de negócio fica no backend (API Routes), nunca exposta no frontend
4. Migrations do banco sempre via Prisma, nunca SQL manual
5. Variáveis de ambiente sensíveis nunca no código — sempre em `.env`
6. Este stack vale para SOL, LUA, MARTE, VÊNUS e todos os produtos futuros da Eden Corporate
7. Chamadas à IA passam pelos adaptadores em `lib/ai/` — nunca instanciar SDK diretamente nas rotas
8. Contagem de tokens: usar `usage` do response da API, nunca bibliotecas externas inline
9. System prompts montados pelo Prompt Engine (`lib/prompt-engine/`), nunca hardcoded inline
10. Arquivos de prompt (`.md`) em `docs/prompts/` são fonte de verdade do conhecimento do SOL
11. Clients de serviços externos são singletons lazy (ex: `lib/tts/elevenlabs.ts`, `lib/video/assemblyai.ts`)
12. Pricing de todos os serviços centralizado em `packages/db/src/pricing.ts`
13. Rate limiting obrigatório em rotas de IA e serviços externos (`lib/rate-limit.ts`)
14. Knowledge Base usa Qdrant — nunca armazenar embeddings no PostgreSQL
