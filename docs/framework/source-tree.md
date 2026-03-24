# Source Tree — SOL (Eden Corporate)

> Estrutura oficial de pastas do projeto SOL.
> Agentes devem criar arquivos respeitando esta estrutura.
> Última atualização: 2026-03-06

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
│   ├── prompts/                    # Arquivos de prompt (.md) — fonte de verdade do SOL
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
├── dev-start.bat                   # Script de inicialização local (Windows)
├── docker-compose.yml              # PostgreSQL local
├── turbo.json                      # Configuração Turborepo
├── pnpm-workspace.yaml             # Workspaces pnpm
└── package.json                    # Root package.json
```

## Aplicação Web (apps/web/)

```
apps/web/
├── src/
│   ├── app/                                # App Router (rotas diretas, sem route groups)
│   │   ├── layout.tsx                      # Layout raiz (html, body, fonts)
│   │   ├── page.tsx                        # Landing page / redirect
│   │   ├── globals.css                     # Tailwind base + tema dark
│   │   │
│   │   ├── login/                          # Autenticação
│   │   │   ├── page.tsx                    # Tela de login
│   │   │   └── actions.ts                 # Server action de login
│   │   ├── register/
│   │   │   └── page.tsx                    # Tela de cadastro
│   │   ├── forgot-password/
│   │   │   └── page.tsx                    # Recuperação de senha
│   │   │
│   │   ├── dashboard/                      # Dashboard do usuário
│   │   │   ├── layout.tsx                  # Wrapper com AppLayout
│   │   │   └── page.tsx                    # Saldo, transações, conversas, referral
│   │   ├── onboarding/
│   │   │   └── page.tsx                    # Fluxo de onboarding (perfis)
│   │   ├── profile/
│   │   │   └── page.tsx                    # Perfil do expert (6 seções)
│   │   ├── quiz/                           # Quiz de diagnóstico
│   │   │   ├── layout.tsx                  # Layout quiz
│   │   │   ├── page.tsx                    # Página principal do quiz
│   │   │   └── [sessionId]/
│   │   │       └── page.tsx                # Sessão de quiz específica
│   │   ├── roteiros/                       # Roteiros gerados pela IA
│   │   │   ├── layout.tsx                  # Wrapper com AppLayout
│   │   │   ├── page.tsx                    # Lista de roteiros
│   │   │   └── [id]/
│   │   │       └── page.tsx                # Detalhe do roteiro (CopyButton + TtsButton)
│   │   ├── credits/                        # Gestão de créditos
│   │   │   ├── layout.tsx                  # Wrapper com AppLayout
│   │   │   ├── buy/
│   │   │   │   ├── page.tsx                # Pacotes de créditos
│   │   │   │   └── components/
│   │   │   │       └── BuyButton.tsx       # Botão de compra Stripe
│   │   │   ├── success/page.tsx            # Pós-pagamento sucesso
│   │   │   └── error/page.tsx              # Pós-pagamento erro
│   │   │
│   │   ├── admin/                          # Console admin (layout próprio, sem AppLayout)
│   │   │   ├── page.tsx                    # Dashboard admin (métricas, tabela de usuários)
│   │   │   ├── ai/page.tsx                 # Configuração de provider de IA
│   │   │   ├── intelligence/page.tsx       # Dashboard de inteligência
│   │   │   ├── knowledge/
│   │   │   │   ├── page.tsx                # Gerenciador de Knowledge Base
│   │   │   │   └── [slug]/page.tsx         # Detalhe de coleção KB
│   │   │   ├── pricing/page.tsx            # Configuração de pricing + simulador
│   │   │   ├── prompts/page.tsx            # Gerenciador de prompts
│   │   │   ├── promos/page.tsx             # Gerenciador de campanhas promo
│   │   │   ├── referral/page.tsx           # Painel do programa de referral
│   │   │   ├── results/page.tsx            # Dashboard de performance
│   │   │   ├── subscriptions/page.tsx      # Gerenciador de planos de assinatura
│   │   │   └── upsell/page.tsx             # Gerenciador de banners upsell
│   │   │
│   │   └── api/                            # API Routes (backend)
│   │       ├── auth/
│   │       │   ├── [...nextauth]/
│   │       │   │   └── route.ts            # NextAuth handler (GET + POST)
│   │       │   ├── register/
│   │       │   │   └── route.ts            # Registro de novo usuário
│   │       │   └── reset-password/
│   │       │       └── route.ts            # Reset de senha
│   │       ├── chat/
│   │       │   └── route.ts                # Chat IA (SSE streaming, multipart, anexos)
│   │       ├── conversations/
│   │       │   ├── route.ts                # Lista/cria conversas
│   │       │   └── [conversationId]/
│   │       │       └── messages/
│   │       │           └── route.ts        # Mensagens de uma conversa
│   │       ├── onboarding/
│   │       │   ├── route.ts                # Lista/cria perfis de onboarding
│   │       │   └── [id]/
│   │       │       └── route.ts            # Detalhe/update perfil
│   │       ├── profile/
│   │       │   ├── route.ts                # GET/PUT perfil do expert
│   │       │   └── completion/
│   │       │       └── route.ts            # Percentual de completude do perfil
│   │       ├── quiz/
│   │       │   ├── route.ts                # Lista/cria sessões de quiz
│   │       │   ├── generate/
│   │       │   │   └── route.ts            # Gera perguntas do quiz
│   │       │   ├── answer/
│   │       │   │   └── route.ts            # Submete resposta do quiz
│   │       │   └── session/[id]/
│   │       │       └── route.ts            # Detalhe da sessão de quiz
│   │       ├── scripts/
│   │       │   └── [id]/
│   │       │       ├── metrics/
│   │       │       │   └── route.ts        # Métricas de performance do roteiro
│   │       │       └── performance/
│   │       │           └── route.ts        # Análise de performance
│   │       ├── video/
│   │       │   ├── upload/
│   │       │   │   └── route.ts            # Upload de vídeo para análise
│   │       │   └── status/[id]/
│   │       │       └── route.ts            # Status do processamento de vídeo
│   │       ├── tts/
│   │       │   ├── generate/
│   │       │   │   └── route.ts            # Geração de áudio TTS (ElevenLabs)
│   │       │   └── audio/[cacheId]/
│   │       │       └── route.ts            # Serve áudio do cache
│   │       ├── payments/
│   │       │   ├── checkout/
│   │       │   │   └── route.ts            # Cria Stripe Checkout Session
│   │       │   ├── one-click/
│   │       │   │   └── route.ts            # Compra com um clique (saved card)
│   │       │   ├── payment-methods/
│   │       │   │   └── route.ts            # Gerencia métodos de pagamento
│   │       │   └── subscribe/
│   │       │       └── route.ts            # Cria assinatura Stripe
│   │       ├── subscription/
│   │       │   ├── cancel/
│   │       │   │   └── route.ts            # Cancela assinatura
│   │       │   ├── change-plan/
│   │       │   │   └── route.ts            # Altera plano de assinatura
│   │       │   └── reactivate/
│   │       │       └── route.ts            # Reativa assinatura
│   │       ├── referral/
│   │       │   ├── set-cookie/
│   │       │   │   └── route.ts            # Salva cookie de referral
│   │       │   └── stats/
│   │       │       └── route.ts            # Estatísticas de referral do usuário
│   │       ├── promos/
│   │       │   ├── active/
│   │       │   │   └── route.ts            # Promo ativa para o usuário
│   │       │   └── track/
│   │       │       └── route.ts            # Rastreia interação com promo
│   │       ├── admin/
│   │       │   ├── add-credits/
│   │       │   │   └── route.ts            # Ajuste manual de créditos (ADMIN)
│   │       │   ├── ai/
│   │       │   │   └── route.ts            # GET/POST config de IA
│   │       │   ├── intelligence/
│   │       │   │   └── route.ts            # Dados do dashboard de inteligência
│   │       │   ├── knowledge/
│   │       │   │   ├── collections/
│   │       │   │   │   ├── route.ts        # Lista/cria coleções KB
│   │       │   │   │   └── [id]/
│   │       │   │   │       └── route.ts    # GET/PUT/DELETE coleção KB
│   │       │   │   ├── documents/
│   │       │   │   │   ├── route.ts        # Lista/upload documentos KB
│   │       │   │   │   └── [id]/
│   │       │   │   │       ├── route.ts    # GET/DELETE documento KB
│   │       │   │   │       └── status/
│   │       │   │   │           └── route.ts # Update status documento
│   │       │   │   └── search/
│   │       │   │       └── route.ts        # Busca em documentos KB
│   │       │   ├── packages/
│   │       │   │   ├── route.ts            # Lista/cria pacotes de créditos
│   │       │   │   └── [id]/
│   │       │   │       └── route.ts        # GET/PUT/DELETE pacote
│   │       │   ├── performance-thresholds/
│   │       │   │   └── route.ts            # Gerencia thresholds de performance
│   │       │   ├── pricing/
│   │       │   │   └── route.ts            # GET/PUT configuração de pricing
│   │       │   ├── prompts/
│   │       │   │   └── route.ts            # GET/POST overrides de prompts
│   │       │   ├── promos/
│   │       │   │   ├── route.ts            # Lista/cria campanhas promo
│   │       │   │   └── preview/
│   │       │   │       └── route.ts        # Preview audiência da campanha
│   │       │   ├── referral/
│   │       │   │   ├── route.ts            # Estatísticas admin de referral
│   │       │   │   └── list/
│   │       │   │       └── route.ts        # Lista todos os referrals
│   │       │   ├── results/
│   │       │   │   └── route.ts            # Resultados de performance
│   │       │   ├── subscriptions/
│   │       │   │   └── route.ts            # Gerencia planos de assinatura
│   │       │   ├── upsell/
│   │       │   │   └── route.ts            # Gerencia campanhas upsell
│   │       │   └── users/
│   │       │       └── reset-password/
│   │       │           └── route.ts        # Admin reset de senha de usuário
│   │       └── webhooks/
│   │           └── stripe/
│   │               └── route.ts            # Webhook Stripe (checkout, subscription, invoice)
│   │
│   ├── components/
│   │   ├── Logo.tsx                        # Logo SVG inline (ícone)
│   │   ├── LogoWithText.tsx                # Logo SVG inline (com texto)
│   │   ├── LogoutButton.tsx                # Botão de logout
│   │   ├── LottieLogo.tsx                 # Logo animado (Lottie)
│   │   │
│   │   ├── admin/                          # Componentes do admin
│   │   │   ├── AddCreditsForm.tsx          # Form de ajuste de créditos
│   │   │   ├── AdminNav.tsx                # Menu de navegação admin (hamburger)
│   │   │   ├── AiProviderSettings.tsx      # Seleção de provider/modelo de IA
│   │   │   ├── CampaignManager.tsx         # Gerenciador de campanhas promo
│   │   │   ├── IntelligenceDashboard.tsx   # Dashboard de métricas de inteligência
│   │   │   ├── KnowledgeCollectionDetail.tsx # Editor de coleção KB
│   │   │   ├── KnowledgeManager.tsx        # Gerenciador de documentos KB
│   │   │   ├── MetricCard.tsx              # Card de métrica (contadores)
│   │   │   ├── PricingSimulator.tsx        # Configuração de pricing + simulador
│   │   │   ├── PromptManager.tsx           # Editor de overrides de prompts
│   │   │   ├── ReferralAdminPanel.tsx      # Painel admin do programa referral
│   │   │   ├── ResetPasswordButton.tsx     # Botão admin reset de senha
│   │   │   ├── ResultsDashboard.tsx        # Dashboard de resultados de performance
│   │   │   ├── SubscriptionPlansManager.tsx # Gerenciador de planos de assinatura
│   │   │   └── UsersTable.tsx              # Tabela de usuários paginada
│   │   │
│   │   ├── dashboard/                      # Componentes do dashboard
│   │   │   ├── ConversationList.tsx        # Lista de conversas
│   │   │   ├── CreditSummary.tsx           # Resumo de saldo
│   │   │   ├── OneClickBuyButton.tsx       # Compra rápida com cartão salvo
│   │   │   ├── Pagination.tsx              # Paginação reutilizável
│   │   │   ├── PaymentSuccessBanner.tsx    # Banner de pagamento concluído
│   │   │   ├── PromoPopup.tsx              # Popup de promoção
│   │   │   ├── ReferralSection.tsx         # Widget de referral
│   │   │   ├── SubscriptionManager.tsx     # Gerenciador de assinatura do usuário
│   │   │   ├── TransactionHistory.tsx      # Histórico de transações
│   │   │   └── UpsellBanner.tsx            # Banner de upsell
│   │   │
│   │   ├── layout/                         # Componentes de layout
│   │   │   ├── AppLayout.tsx               # Layout principal (header flutuante pill)
│   │   │   ├── CreditsBadge.tsx            # Badge de saldo no header
│   │   │   └── CreditsProvider.tsx         # Context provider de créditos
│   │   │
│   │   ├── performance/                    # Componentes de performance de roteiros
│   │   │   ├── MetricsForm.tsx             # Form de métricas manuais
│   │   │   ├── MetricsHistory.tsx          # Histórico de métricas
│   │   │   ├── PerformancePanel.tsx        # Painel de performance
│   │   │   └── StatusTracker.tsx           # Tracker de status do roteiro
│   │   │
│   │   ├── profile/                        # Componentes de perfil
│   │   │   └── ExpertProfileForm.tsx       # Form de perfil do expert (6 seções)
│   │   │
│   │   ├── quiz/                           # Componentes do quiz
│   │   │   ├── GeneratingScript.tsx        # Animação de loading/geração
│   │   │   └── QuizEngine.tsx              # Motor do quiz interativo
│   │   │
│   │   ├── tts/                            # Componentes de text-to-speech
│   │   │   └── TtsButton.tsx               # Botão de playback TTS (ElevenLabs)
│   │   │
│   │   └── video/                          # Componentes de vídeo
│   │       ├── ProcessingStatus.tsx        # Status de processamento de vídeo
│   │       └── VideoUpload.tsx             # Upload de vídeo para análise
│   │
│   ├── lib/
│   │   ├── auth.ts                         # Configuração NextAuth v5 (JWT, Credentials)
│   │   ├── credits-config.ts               # Constantes: pacotes de créditos, percentuais
│   │   ├── file-processor.ts               # Extração de texto: PDF, DOCX, imagens (OCR)
│   │   ├── format-balance.ts               # Formatação de saldo (centavos → R$)
│   │   ├── prompts.ts                      # System prompts da IA (fallback)
│   │   ├── rate-limit.ts                   # Rate limiting in-memory por IP/key
│   │   ├── referral-cookie.ts              # Lógica de cookie de referral
│   │   ├── stripe.ts                       # Cliente Stripe (singleton)
│   │   ├── stripe-customer.ts              # Gerenciamento de customer Stripe
│   │   │
│   │   ├── ai/                             # Adaptadores de IA (provider-agnostic)
│   │   │   ├── index.ts                    # getAiAdapter(provider) — factory
│   │   │   ├── types.ts                    # AiAdapter, StreamResult, AiProvider
│   │   │   ├── anthropic-adapter.ts        # Adapter Anthropic Claude
│   │   │   └── openai-adapter.ts           # Adapter OpenAI GPT
│   │   │
│   │   ├── knowledge/                      # Knowledge Base / RAG
│   │   │   ├── chunker.ts                  # Chunking de texto para embeddings
│   │   │   ├── embeddings.ts               # Geração de embeddings (OpenAI)
│   │   │   ├── processor.ts                # Pipeline de processamento de documentos
│   │   │   ├── qdrant.ts                   # Cliente Qdrant (vector DB)
│   │   │   ├── retriever.ts                # Retrieval de documentos RAG
│   │   │   └── storage.ts                  # Armazenamento de documentos
│   │   │
│   │   ├── performance/                    # Performance de roteiros
│   │   │   ├── classifier.ts               # Classificação de performance
│   │   │   └── types.ts                    # Tipos de performance
│   │   │
│   │   ├── prompt-engine/                  # Montagem de prompts (3 camadas)
│   │   │   ├── index.ts                    # assemblePrompt() — orquestrador
│   │   │   ├── base.ts                     # Layer 1: Base fixa por path
│   │   │   ├── modules/index.ts            # Layer 2: Módulos contextuais
│   │   │   ├── patterns.ts                 # Layer 3: Padrões de nicho
│   │   │   └── types.ts                    # MarketClassification, AssembledPrompt
│   │   │
│   │   ├── quiz/                           # Lógica do quiz
│   │   │   ├── conditions.ts               # Lógica condicional do quiz
│   │   │   ├── market-classifier.ts        # Classificador de awareness/sophistication
│   │   │   ├── prompt-builder.ts           # Geração de prompts do quiz
│   │   │   └── questions.ts                # Definição das perguntas
│   │   │
│   │   ├── tts/                            # Text-to-Speech
│   │   │   └── elevenlabs.ts               # Cliente ElevenLabs (singleton, geração MP3)
│   │   │
│   │   └── video/                          # Processamento de vídeo
│   │       ├── assemblyai.ts               # Cliente AssemblyAI (transcrição)
│   │       ├── ffmpeg.ts                   # FFmpeg (extração de frames)
│   │       └── processor.ts                # Pipeline de análise de vídeo
│   │
│   ├── types/
│   │   └── next-auth.d.ts                  # Ambient declaration: Session.user.id, .role
│   │
│   ├── assets/
│   │   └── Camada 1Logotipo.json           # Animação Lottie do logo
│   │
│   └── middleware.ts                       # NextAuth middleware (proteção de rotas)
│
├── public/                                 # Assets estáticos
├── next.config.mjs                         # Config Next.js (CSP, transpile @sol/db)
├── tailwind.config.ts                      # Tailwind v3 (cores hex, tema solar)
├── postcss.config.mjs                      # PostCSS (Tailwind + Autoprefixer)
├── tsconfig.json                           # TypeScript config
├── .eslintrc.json                          # ESLint (next/core-web-vitals + strict)
└── package.json                            # Dependências da aplicação
```

## Pacote de Banco de Dados (packages/db/)

```
packages/db/
├── prisma/
│   ├── schema.prisma                       # Schema do banco de dados
│   ├── seed.ts                             # Seed: admin user + dados iniciais
│   └── migrations/                         # 19 migrations aplicadas
│       ├── 20260225045419_init/
│       ├── 20260225193516_add_credits_non_negative_constraint/
│       ├── 20260226220000_pricing_refactoring/
│       ├── 20260227040156_add_user_role/
│       ├── 20260227180000_remove_min_balance_add_max_tokens/
│       ├── 20260228024918_add_attachment_fields/
│       ├── 20260228120000_admin_console/
│       ├── 20260303000000_credits_pricing_refactoring/
│       ├── 20260303214719_/
│       ├── 20260303230000_add_credits_non_negative_check/
│       ├── 20260304193951_/
│       ├── 20260304202057_/
│       ├── 20260304205911_/
│       ├── 20260304231712_add_expert_profile_and_fields/
│       ├── 20260305212723_/
│       ├── 20260306004741_add_pricing_config_text_value/
│       ├── 20260306014841_add_knowledge_base_models/
│       ├── 20260306200000_add_external_service_billing_fields/
│       └── 20260306210000_add_tts_audio_cache/
├── src/
│   ├── index.ts                            # Prisma Client singleton + barrel exports
│   ├── admin.ts                            # getUserMetrics, getUsageMetrics, getFinancialMetrics, getUsersList
│   ├── ai-config.ts                        # getAiConfig, invalidateAiConfigCache (provider switching)
│   ├── campaigns.ts                        # listCampaigns, createCampaign, updateCampaign, getCampaignMetrics
│   ├── conversations.ts                    # createConversation, getConversationWithMessages, listConversations, addMessage
│   ├── credits.ts                          # addCredits, deductCredits, InsufficientBalanceError
│   ├── knowledge.ts                        # CRUD coleções KB, documentos, chunks, RAG helpers
│   ├── pricing.ts                          # getPricingConfig, calculate*Credits (AI, AssemblyAI, Embeddings, ElevenLabs)
│   ├── prompt-config.ts                    # getPromptOverride, setPromptOverride, getAllPromptOverrides
│   ├── referral.ts                         # generateReferralCode, validateReferralCode, processReferralReward, getReferralStats
│   ├── subscription-plans.ts               # CRUD planos, getUserSubscription, createUserSubscription
│   └── token-counter.ts                    # countTokens (tiktoken) — import via @sol/db/token-counter
├── package.json
└── tsconfig.json
```

### Modelos do Schema (prisma/schema.prisma)

**Autenticação & Usuários:**
- `User` — usuário autenticado (email, passwordHash, role, credits, stripeCustomerId, referralCode)
- `Session` — sessões JWT do NextAuth
- `ExpertProfile` — perfil detalhado do expert (6 seções: dados pessoais, estilo, valores, história, audiência, conteúdo)

**Chat & Conversas:**
- `Conversation` — conversa do chat (title, userId, quizSessionId)
- `Message` — mensagem individual (role, content)

**Quiz & Onboarding:**
- `OnboardingProfile` — perfil de onboarding (name, answers JSON)
- `QuizSession` — sessão de quiz (path1, path2, status, awarenessLevel, sophisticationLevel, classification)
- `QuizAnswer` — resposta individual do quiz (section, questionKey, answerType, answerValue)
- `VideoAnalysis` — análise de vídeo do quiz (transcription, frameDescriptions, structureAnalysis)

**Performance de Roteiros:**
- `ScriptPerformance` — performance do roteiro (contentType, status, niche, executionScore)
- `PerformanceMetrics` — métricas do roteiro (impressions, ctr, cpc, hookRate, retention, etc.)
- `ExecutionAnalysis` — análise de execução (videoUrl, comparisonResult, score, suggestions)
- `PerformanceThreshold` — thresholds configuráveis por contentType e métrica

**Financeiro:**
- `CreditTransaction` — movimentação financeira (purchase, consumption, adjustment, subscription_renewal, promo_purchase, referral)
- `CreditPackage` — pacotes de créditos à venda (name, credits, priceBrl)
- `PricingConfig` — configuração de pricing por chave (key, value, textValue)

**Assinaturas:**
- `SubscriptionPlan` — planos de assinatura (name, creditsMonthly, priceInCents, Stripe IDs)
- `UserSubscription` — assinatura ativa do usuário (status, período, cancelamento)
- `StripeProductRecord` — histórico de produtos Stripe por plano

**Campanhas & Referral:**
- `PromoCampaign` — campanha promocional (filters, status, offerType, período)
- `PromoDelivery` — entrega de promo por usuário (viewed, clicked, converted, dismissed)
- `ReferralReward` — recompensa de referral (referrer, referred, créditos)

**Knowledge Base:**
- `KbCollection` — coleção KB (name, slug, qdrantName, tags)
- `KbDocument` — documento KB (title, sourceType, textContent, processingStatus)
- `KbChunk` — chunk de documento para embeddings (text, tokenCount, qdrantPointId)

**TTS:**
- `TtsAudioCache` — cache de áudio TTS (messageId, voiceId, audioPath, creditsCharged)

**Configuração:**
- `AppConfig` — configuração genérica da aplicação (key, value)

### Enums

- `Role` — `USER | ADMIN`
- `MessageRole` — `user | assistant`
- `TransactionType` — `purchase | consumption | adjustment | subscription_renewal | promo_purchase | referral`
- `Path1` — `AD | ORGANIC`
- `Path2` — `MODELED | FROM_SCRATCH`
- `QuizStatus` — `IN_PROGRESS | COMPLETED | ABANDONED`
- `QuizSection` — `INITIAL | AD_CREATIVE | ORGANIC_VIDEO | MODELED_VIDEO | FROM_SCRATCH_VIDEO`
- `AnswerType` — `TEXT | SINGLE_SELECT | MULTI_SELECT | UPLOAD`
- `VideoStatus` — `QUEUED | PROCESSING | COMPLETED | FAILED`
- `ContentType` — `PAID | ORGANIC`
- `PerformanceStatus` — `PRODUCED | PUBLISHED | METRICS | ANALYZED`
- `Classification` — `TERRIBLE | BAD | AVERAGE | GOOD | EXCELLENT`
- `SubscriptionStatus` — `ACTIVE | CANCELED | PAST_DUE | PAUSED`
- `StripeRecordStatus` — `ACTIVE | ARCHIVED`
- `OfferType` — `CREDIT_PACKAGE | SUBSCRIPTION_PLAN | CUSTOM`
- `CampaignStatus` — `DRAFT | ACTIVE | PAUSED | ENDED`
- `ReferralStatus` — `PENDING | CREDITED | EXPIRED`
- `KbDocumentType` — `PDF | DOCX | TXT | VIDEO`
- `KbProcessingStatus` — `QUEUED | PROCESSING | COMPLETED | FAILED`

## Regras de Localização

| Tipo de código | Local correto | Exemplo |
|---|---|---|
| Lógica de negócio (dados) | `packages/db/src/` | Créditos, pricing, conversas, referral, KB |
| Lógica de negócio (orquestração) | `apps/web/src/app/api/` | Validação de request, chamadas IA, SSE, webhooks |
| Adaptadores de serviços externos | `lib/{service}/` | `ai/`, `tts/`, `video/`, `knowledge/` |
| Componentes reutilizáveis | `components/{feature}/` | `admin/`, `dashboard/`, `quiz/`, `tts/`, `video/` |
| Componentes de layout | `components/layout/` | AppLayout, CreditsBadge, CreditsProvider |
| Configurações de serviços | `lib/` (raiz) | auth.ts, stripe.ts, rate-limit.ts |
| Prompt Engine | `lib/prompt-engine/` | Base + Módulos + Padrões (3 camadas) |
| Lógica de quiz | `lib/quiz/` | Questions, conditions, classifier, prompt-builder |
| Tipos TypeScript | `types/` | Ambient declarations (.d.ts) |
| Assets estáticos | `src/assets/` (bundled) ou `public/` (servidos) | Lottie JSON |

### Regras importantes

- **Nunca** criar lógica de negócio dentro de componentes React
- **Nunca** importar Prisma Client diretamente — usar `@sol/db` ou `@sol/db/token-counter`
- **Componentes de feature** ficam em `components/{feature}/` (ex: `admin/`, `dashboard/`, `quiz/`)
- **Componentes globais** ficam na raiz de `components/` (ex: `Logo.tsx`, `LogoutButton.tsx`)
- **Layouts por seção** usam `AppLayout` via `{section}/layout.tsx` — exceto `/admin` que tem layout próprio
- **Adaptadores de IA** seguem a interface `AiAdapter` em `lib/ai/types.ts` — provider-agnostic
- **Clients de serviços externos** são singletons lazy em `lib/{service}/` (ex: `tts/elevenlabs.ts`, `video/assemblyai.ts`)
- **Pricing de serviços** centralizado em `packages/db/src/pricing.ts` — cada serviço tem `calculate*Credits()`
