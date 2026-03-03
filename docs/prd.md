# SOL Product Requirements Document (PRD)

## Goals and Background Context

### Goals

- Permitir que alunos do Space (Eden Corporate) criem ofertas de infoprodutos diferenciadas sem depender de mentoria individual
- Permitir que alunos gerem roteiros de criativos (anúncios e vídeos orgânicos) de forma rápida via quiz estruturado + IA
- Reduzir a saturação no leilão de anúncios causada por alunos vendendo o mesmo produto com os mesmos criativos
- Escalar a entrega de valor que hoje só acontece via mentoria 1:1 (R$100k já vendidos) em formato SaaS
- Aumentar margem do negócio ao transformar consultoria em produto recorrente
- Que cada aluno consiga criar e testar um novo roteiro em **menos de 30 minutos** usando o SOL
- Permitir que alunos modelem roteiros a partir de vídeos de referência (upload + análise por IA)

### Background Context

O Space, programa de educação em marketing digital da Eden Corporate, ensina centenas de alunos a vender a mesma categoria de infoprodutos (ex: Pilates na Parede) usando as mesmas estruturas de oferta e criativos. À medida que a base de alunos cresce, esse padrão gera saturação no leilão de anúncios — alunos competem entre si com criatividades idênticas, elevando CPM e reduzindo conversão. A única saída hoje é a mentoria individual, que não escala.

O SOL é um SaaS de IA que resolve esse gargalo diretamente: via quiz estruturado, o aluno responde perguntas sobre seu produto, público, contexto e estilo, e a IA gera um roteiro de criativo completamente novo e personalizado. O modelo é **quiz-first + chat complementar** — o quiz coleta contexto rico (48 perguntas, 6 seções, 4 caminhos condicionais) e a IA gera o roteiro; o chat permite iterar/refinar o resultado depois. Para roteiros modelados, o aluno faz upload de um vídeo de referência que é processado automaticamente (transcrição + análise visual + análise estrutural por IA). Como produto de upsell do Space, o SOL já chega com contexto de mercado estabelecido, base de clientes aquecida e validação de demanda (R$100k+ em mentorias vendidas). O MVP foca em velocidade de entrega: quiz funcional, geração de roteiro via IA, chat de iteração, autenticação segura, sistema de créditos e pagamento integrado.

### Change Log

| Date       | Version | Description       | Author      |
| ---------- | ------- | ----------------- | ----------- |
| 2026-02-24 | 1.0     | Initial PRD draft | Morgan (PM) |
| 2026-02-26 | 2.0     | Novo modelo de precificação: créditos como unidade monetária interna com custo variável por mensagem baseado em consumo real de tokens e cotação USD-BRL diária. Atualização de FR5, FR6, FR7, FR9, NFR4, Technical Assumptions, Stories 3.1 e 3.2. | Morgan (PM) |
| 2026-02-26 | 2.1     | Alinhamento com refinamento do @architect: User.credits → balanceCents + minBalanceCents, CreditTransaction com inputTokens/outputTokens/costUsd, ExchangeRate com currency+date (@@unique), funções getExchangeRate/updateExchangeRate, header X-Balance-Remaining | Morgan (PM) |
| 2026-02-27 | 3.0     | Adição do Epic 4 (Admin & Operações) com Story 4.1 (Painel Administrativo). Documenta funcionalidade /admin já implementada e define critérios de aceite para proteção de rota com role-based access control. | Morgan (PM) |
| 2026-02-27 | 4.0     | Novo modelo de precificação: gate pré-chamada estima custo máximo (input real + MAX_OUTPUT_TOKENS=8192 × taxa), saldo nunca fica negativo. Remoção do conceito `minBalanceCents`. `CREDIT_PERCENTAGE` substitui `CREDIT_MARGIN_PERCENT`. Atualização de FR5, FR6, FR9, Technical Assumptions, Stories 3.1, 3.2, 3.4, 3.6. | Morgan (PM) |
| 2026-02-27 | 5.0     | Adição de FR11 (Suporte a Anexos no Chat) e Story 2.5. Aluno pode anexar imagens (Vision API, forçando GPT-4o) e documentos (PDF, TXT, MD, DOCX) com extração de texto. Limites: 3 arquivos/msg, 10MB/arquivo, 50k chars/doc. Processamento in-memory, sem persistência. Custo de tokens do anexo incluído no gate e dedução real. Novos campos de auditoria: `hasAttachments`, `attachmentTypes`, `attachmentTokens`. | Morgan (PM) |
| 2026-02-28 | 6.0     | Adição de FR12 (Admin Console) e Story 4.2. Painel administrativo completo em /admin com métricas reais de usuários, uso, financeiras e de cotação. Ação de adição manual de créditos em reais (sem Stripe) com auditoria completa. Novos campos: `grossAmountCents` e `adminEmail` em `CreditTransaction`, tipo `adjustment` no enum `TransactionType`. Webhook Stripe e `addCredits()` atualizados para registrar valor bruto e suportar adjustments. | Morgan (PM) |
| 2026-03-03 | 8.0     | Refatoração completa do modelo de precificação. Modelo anterior (centavos, câmbio diário, CREDIT_PERCENTAGE) removido. Novo modelo: créditos por tokens (CREDITS_PER_M_INPUT=500, CREDITS_PER_M_OUTPUT=2000), configuráveis via admin. Tabelas exchange_rates removida, pricing_config e credit_packages adicionadas. User.balanceCents → User.credits. FR5, FR6, FR7, FR9 substituídos. FR19-FR20 adicionados. Story 3.6 removida. NFR4 substituído. | Morgan (PM) |
| 2026-03-03 | 9.0     | Evolução de produto: chat-first → quiz-first + chat complementar. Novo Epic 6 (Quiz & Onboarding): 48 perguntas, 6 seções, 4 caminhos condicionais, onboarding persistente com múltiplos perfis. Novo Epic 7 (Video Processing): upload de vídeo → AssemblyAI (transcrição) → FFmpeg (frames) → IA (análise estrutural) → descrição textual. Renomeação Conversas → Roteiros. Chat permanece como feature complementar para iteração sobre roteiros. FR21–FR27 adicionados. UI Design Goals atualizado para quiz-first. AssemblyAI + FFmpeg como novas dependências. Sistema de créditos inalterado. Epics 1, 3, 4, 5.5 intactos. | Morgan (PM) |

---

## Requirements

### Functional

- **FR1:** O sistema deve permitir que usuários se cadastrem e façam login com email e senha via NextAuth.js v5 (Credentials Provider)
- **FR2:** O sistema deve manter sessão autenticada via JWT em cookie httpOnly
- **FR3:** O usuário autenticado deve ter acesso a um chat conversacional com IA como feature **complementar** — utilizado para iterar/refinar roteiros gerados pelo quiz ou para discussões livres sobre criação de ofertas
- **FR4:** O chat deve enviar mensagens para a API da OpenAI (GPT-4o para outputs finais, GPT-4o-mini para iterações) e retornar respostas via streaming (Server-Sent Events)
- **FR5:** O sistema deve calcular o custo máximo estimado em créditos da mensagem (tokens de input reais × CREDITS_PER_M_INPUT/1M + MAX_OUTPUT_TOKENS × CREDITS_PER_M_OUTPUT/1M, arredondado para cima, mínimo 1), verificar se o saldo de créditos cobre esse máximo, executar a chamada OpenAI se coberto, e deduzir os créditos reais (baseados em tokens efetivamente consumidos) após o streaming completar
- **FR6:** O usuário deve ser bloqueado de enviar novas mensagens quando seu saldo de créditos for insuficiente para cobrir o custo máximo estimado em créditos
- **FR7:** O usuário deve poder visualizar seu saldo atual de créditos e quantos créditos foram gastos na última mensagem. O aluno NÃO visualiza tokens, custo em reais ou qualquer dado de backend
- **FR8:** O sistema deve permitir a compra de pacotes de créditos via Stripe Checkout (cartão e PIX)
- **FR9:** O sistema deve processar webhooks do Stripe para confirmar pagamentos e creditar o número exato de créditos do pacote comprado no saldo do usuário. Sem conversão, sem porcentagem
- **FR10:** O usuário deve ter acesso a um painel básico com: saldo de créditos, histórico de compras e histórico de conversas
- **FR11:** O aluno pode anexar até 3 arquivos por mensagem (imagens: JPEG, PNG, GIF, WEBP; documentos: PDF, TXT, MD, DOCX; máx 10MB cada) como contexto adicional para a IA. Imagens processadas via OpenAI Vision API (forçando GPT-4o). Documentos têm conteúdo extraído como texto (limite 50.000 caracteres — rejeitado se exceder, nunca truncado). Arquivos processados em memória sem persistência. Custo em créditos inclui tokens dos anexos no gate e na dedução real
- **FR12:** Usuários com `role: ADMIN` têm acesso ao painel em `/admin` (e rotas `/api/admin/*`) com dados reais do banco. O painel exibe: **(a) Métricas de Usuários** — total cadastrados, ativos nos últimos 7d (≥1 mensagem), sem saldo útil (`credits = 0`), novos nos últimos 30d, lista paginada 20/pág com email, saldo em créditos, total de mensagens e data de cadastro; **(b) Métricas de Uso** — mensagens totais/hoje/7d, tokens input/output separados, modelo mais usado com percentual, média de tokens/mensagem, total de mensagens com e sem anexo; **(c) Métricas Financeiras** — receita bruta via `SUM(priceInCents) dos pacotes vendidos WHERE type = 'purchase'`, custo OpenAI estimado via tokens e pricing da API, lucro bruto, margem bruta e markup, créditos vendidos vs consumidos, saldo total de créditos retido na plataforma; **(d) Adição Manual de Créditos** — admin informa email + quantidade de créditos + motivo, confirmação antes de executar, registrado com `type: adjustment`, `adminEmail`, `description`, sem Stripe
- **FR19:** Administradores com `role: ADMIN` podem visualizar e editar as constantes de precificação (CREDITS_PER_M_INPUT, CREDITS_PER_M_OUTPUT) e os pacotes de créditos (nome, créditos, preço) via painel admin. Alterações entram em vigor imediatamente para novas mensagens. Transações passadas mantêm snapshot da config vigente no momento
- **FR20:** O painel admin deve exibir um simulador de precificação em tempo real mostrando: custo em créditos por perfil de mensagem (curta, média, longa, pesada), estimativa de mensagens por pacote, custo real OpenAI vs receita, margem e markup por pacote
- **FR21:** O sistema deve implementar um quiz estruturado com 48 perguntas distribuídas em 6 seções: Onboarding (9 perguntas), Quiz Inicial (7+1 condicional), Caminho 1A — Anúncio Criativo (5 perguntas), Caminho 1B — Vídeo Orgânico (3 perguntas), Caminho 2A — Vídeo Modelado (13 perguntas incluindo upload), Caminho 2B — Vídeo do Zero (11 perguntas). Perguntas condicionais aparecem/escondem baseado em respostas anteriores (ex: "sem aparecer" → abre sub-pergunta 3.1 sobre formato de produção)
- **FR22:** O sistema deve suportar onboarding persistente com múltiplos perfis por usuário (um por produto/nicho). As 9 perguntas de onboarding são preenchidas uma única vez por perfil e reutilizadas em todas as produções futuras. O aluno pode selecionar perfil existente ou criar novo antes de cada quiz
- **FR23:** O sistema deve processar upload de vídeo no caminho 2A (Vídeo Modelado): aluno faz upload de vídeo referência → armazenamento temporário em disco → AssemblyAI transcreve (speakers, emoção) → FFmpeg extrai frames visuais → IA (GPT-4o Vision) analisa estrutura (ganchos, CTA, cortes) → gera descrição textual consolidada → arquivo de vídeo deletado. Limites: 5 minutos de duração, ~500MB. Processamento leva 30–120 segundos com UX de progresso
- **FR24:** Ao completar todas as seções do quiz, o sistema deve gerar um roteiro completo via IA usando TODO o contexto coletado (onboarding + quiz inicial + caminho 1 + caminho 2 + video analysis se 2A). A geração usa streaming SSE, cria um Roteiro (Conversation com quizSessionId) e aplica o gate de créditos existente (mesma lógica do chat: tokens de input do prompt completo + MAX_OUTPUT_TOKENS)
- **FR25:** O sistema deve exibir "Meus Roteiros" (substituindo "Minhas Conversas") com listagem de roteiros gerados. Cada roteiro mostra: título, data, caminhos usados (ex: Anúncio + Modelado). Clicar abre o roteiro com opção de chat de iteração
- **FR26:** Após geração do roteiro, o aluno pode enviar mensagens no mesmo Roteiro (Conversation) para iterar/refinar. O system prompt do chat de iteração inclui contexto completo do quiz + roteiro gerado. Créditos deduzidos por mensagem (mesma lógica do FR5)
- **FR27:** O quiz deve exibir 4 combinações de caminhos possíveis baseado nas ramificações do Quiz Inicial: (1A+2A) Anúncio + Modelado, (1A+2B) Anúncio + Do Zero, (1B+2A) Orgânico + Modelado, (1B+2B) Orgânico + Do Zero. Cada combinação determina quais seções de perguntas são apresentadas ao aluno

### Non Functional

- **NFR1:** A stack deve seguir arquitetura zero lock-in — Next.js 14 + Prisma + PostgreSQL + Docker, sem uso de Supabase, Firebase, Vercel (produção) ou qualquer BaaS
- **NFR2:** Todo código deve ser TypeScript strict mode — sem `any`, sem `as unknown`
- **NFR3:** O tempo de resposta da primeira palavra via streaming do chat não deve exceder 3 segundos em condições normais de rede
- **NFR4:** A lógica de consumo de créditos deve ser implementada no banco (PostgreSQL + Prisma). Cada `credit_transaction` de consumo deve registrar `input_tokens`, `output_tokens`, `model_used`, `credits_per_m_input` e `credits_per_m_output` (snapshot) para auditoria completa. Cotação USD-BRL NÃO é mais gerenciada pelo sistema — margem é controlada via constantes de créditos/tokens e preço dos pacotes
- **NFR5:** Toda lógica de negócio (deducção de créditos, processamento de webhooks) deve ficar em API Routes do Next.js, nunca exposta no frontend
- **NFR6:** Variáveis sensíveis (chaves OpenAI, Stripe, NextAuth secret) nunca devem aparecer no código — sempre em `.env`
- **NFR7:** O sistema deve ser deployável via Docker Compose em VPS própria
- **NFR8:** O MVP deve suportar operação com até 200 usuários ativos concorrentes sem degradação perceptível

---

## User Interface Design Goals

### Overall UX Vision

Interface minimalista e guiada: o aluno entra, responde um quiz estruturado sobre seu produto e contexto, e recebe um roteiro de criativo completo gerado por IA. A experiência é **quiz-first** — o quiz coleta contexto rico de forma guiada (perguntas com opções, progresso visível, caminhos condicionais), e o chat permite iterar depois. Visual limpo, dark mode como padrão por sensação premium, barra de progresso por seção, sidebar de navegação entre etapas.

### Key Interaction Paradigms

- **Quiz-first:** tela principal é o quiz estruturado — perguntas guiadas com progresso visível, não um chat aberto
- **Caminhos condicionais:** a experiência se adapta às escolhas do aluno (4 combinações possíveis)
- **Streaming visível:** roteiro gerado aparece token a token via SSE, dando sensação de resposta ao vivo
- **Saldo sempre visível:** badge de créditos no header em todas as telas, nunca escondido
- **Chat como iteração:** após receber o roteiro, aluno pode conversar para refinar/ajustar
- **Onboarding persistente:** preenchido uma vez por produto, reutilizado em todas as produções

### Core Screens and Views

1. **Login / Cadastro** — tela simples com email + senha, sem OAuth no MVP
2. **Onboarding** — 9 perguntas sobre produto/nicho do aluno. Preenchido 1 vez por perfil. Aluno pode ter múltiplos perfis (um por produto). URL: `/onboarding`
3. **Quiz (Novo Roteiro)** — tela principal do produto. Sidebar com navegação por seções (Onboarding, Quiz Inicial, Caminho 1, Caminho 2). Barra de progresso por seção. Perguntas renderizadas dinamicamente por tipo (aberta, seleção, upload). Lógica condicional: perguntas aparecem/escondem baseado em respostas anteriores. URL: `/novo-roteiro`
4. **Meus Roteiros** — lista de roteiros gerados (substitui "Minhas Conversas"). Cada roteiro mostra título, data, caminhos usados. Clicar abre o roteiro + chat de iteração. URL: `/roteiros`
5. **Roteiro + Chat de Iteração** — roteiro gerado pelo quiz + área de chat abaixo para iterar/refinar. URL: `/roteiros/[id]`
6. **Prompt inline de créditos insuficientes** — ao tentar gerar roteiro ou enviar mensagem com saldo insuficiente, aparece prompt inline (não modal, não página separada) com CTA direto para compra de créditos
7. **Painel do Usuário** — saldo de créditos, histórico de compras de créditos, lista de roteiros (link para reabrir)
8. **Compra de Créditos** — listagem de pacotes disponíveis → redirect para Stripe Checkout
9. **Sucesso/Erro de Pagamento** — páginas de retorno após o checkout do Stripe

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
- **Pagamentos:** Stripe Checkout + Webhooks. PIX + cartão. Lógica de créditos 100% no PostgreSQL (`credit_transactions`), nunca no Stripe. Webhook credita o número exato de créditos do pacote comprado — sem conversão, sem porcentagem.
- **IA:** OpenAI GPT-4o para outputs finais, GPT-4o-mini para iterações intermediárias. Streaming via Server-Sent Events (não WebSockets). Contagem precisa de tokens via `tiktoken` para cálculo de custo em créditos por mensagem. Parâmetro `max_tokens: 8192` — teto de segurança para limitar custo máximo por resposta, não limitador de qualidade (respostas típicas usam 200-2000 tokens). Contexto enviado: system prompt + resumo das últimas 10 mensagens + mensagem atual.
- **Modelo de custo por mensagem (créditos por tokens):** Constantes configuráveis via admin (tabela `pricing_config`): `CREDITS_PER_M_INPUT = 500` (créditos por 1M tokens de input), `CREDITS_PER_M_OUTPUT = 2000` (créditos por 1M tokens de output), `MAX_OUTPUT_TOKENS = 8192` (teto de segurança). Gate pré-chamada: `maxCredits = max(1, ceil(inputTokens/1M × CREDITS_PER_M_INPUT + MAX_OUTPUT_TOKENS/1M × CREDITS_PER_M_OUTPUT))`. Se `user.credits < maxCredits` → 402. Após streaming, calcula créditos reais: `creditsUsed = max(1, ceil(inputTokens/1M × CREDITS_PER_M_INPUT + outputTokens/1M × CREDITS_PER_M_OUTPUT))`. Mínimo: 1 crédito por mensagem. Cada transação registra `inputTokens`, `outputTokens`, `modelUsed`, `creditsPerMInput` e `creditsPerMOutput` (snapshot) para auditoria.
- **Pacotes de créditos:** Armazenados na tabela `credit_packages` (configuráveis via admin): Starter (R$29,90 → 100 créditos), Pro (R$99,90 → 500 créditos), Max (R$199,90 → 1200 créditos). Aluno paga R$ → recebe créditos inteiros do pacote. Sem conversão, sem câmbio.
- **Proteções:** Saldo negativo é matematicamente impossível. O gate pré-chamada garante que o saldo de créditos cobre o pior caso (input real + 8192 tokens de output). Como o custo real é sempre ≤ custo estimado e o saldo cobria o estimado, o saldo após dedução é sempre ≥ 0.
- **Infraestrutura:** VPS própria, Docker Compose, GitHub Actions para CI/CD. Proibido: Vercel produção, Railway, Render. FFmpeg instalado no Docker container (`apt-get install ffmpeg`) para processamento de vídeo.
- **Idioma do código:** TypeScript strict mode. Sem `any`. Sem `as unknown`.
- **Variáveis sensíveis:** sempre em `.env`, nunca hardcodadas. Inclui: `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXTAUTH_SECRET`, `DATABASE_URL`, `ASSEMBLYAI_API_KEY`. Nota: `CREDITS_PER_M_INPUT` e `CREDITS_PER_M_OUTPUT` NÃO são variáveis de ambiente — são armazenados no banco (tabela `pricing_config`) e editáveis via admin.
- **Novas variáveis de ambiente (Epic 7):** `ASSEMBLYAI_API_KEY` (chave da API AssemblyAI), `VIDEO_MAX_DURATION_SECONDS=300` (5 minutos), `VIDEO_MAX_SIZE_MB=500`, `VIDEO_TEMP_DIR=/tmp/sol-uploads` (diretório temporário no container).
- **Anexos no chat:** Suporte a upload de arquivos como contexto para a IA. Imagens (JPEG, PNG, GIF, WEBP) processadas via OpenAI Vision API — forçam uso de GPT-4o independente do modelo padrão. Documentos (PDF, TXT, MD, DOCX) têm conteúdo extraído como texto plano em memória — nunca persistidos em disco ou storage externo. Limites: 10MB/arquivo, 3 arquivos/mensagem, 50.000 caracteres/documento (rejeitado com mensagem clara se exceder, nunca truncado). PDFs escaneados (sem texto extraível) detectados e avisados ao aluno. Tokens de anexos somados ao input para cálculo de gate e custo real em créditos. `CreditTransaction` registra `hasAttachments` (Boolean), `attachmentTypes` (String[]) e `attachmentTokens` (Int) para auditoria. Request com anexo enviado via `multipart/form-data`; sem anexo, mantém `application/json` sem alteração.
- **Processamento de vídeo (Epic 7):** AssemblyAI SDK (`assemblyai` npm package) para transcrição de vídeo com speakers e emoção. FFmpeg (binário no Docker container) para extração de frames visuais. Armazenamento temporário em disco (`/tmp/sol-uploads/`) — arquivo deletado após processamento via `try/finally`. Timeout total: 3 minutos. Progresso reportado ao frontend via polling. GPT-4o Vision para análise de frames, GPT-4o para consolidação estrutural (ganchos, CTA, cortes, tom).

---

## Epic List

| Epic | Title                 | Goal                                                                                                                                                                          |
| ---- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Foundation & Auth     | Estabelecer infraestrutura (Turborepo, Docker, PostgreSQL, CI/CD) e autenticação completa (NextAuth.js v5). Entrega: produto deployado com login funcional.                   |
| 2    | Chat (Complementar)   | Implementar chat com streaming OpenAI, persistência de histórico e estado inline de créditos insuficientes. Chat é feature complementar para iteração sobre roteiros e discussões livres. |
| 3    | Créditos & Pagamentos | Implementar sistema de créditos por tokens, pacotes de créditos, Stripe Checkout + PIX/cartão, webhooks e painel do usuário. Entrega: SOL monetizado, ciclo de valor fechado. |
| 4    | Admin & Operações     | Painel administrativo com métricas reais de usuários, uso e financeiras, mais ação de adição manual de créditos com auditoria completa. Entrega: operador tem visibilidade financeira e operacional total do SOL. |
| 5.5  | Pricing Admin         | Painel administrativo de precificação com simulador em tempo real e edição de constantes e pacotes. Entrega: operador controla precificação sem deploy. |
| 6    | Quiz & Onboarding     | Experiência central do SOL: quiz estruturado com 48 perguntas, 6 seções, 4 caminhos condicionais, onboarding persistente com múltiplos perfis e geração de roteiro via IA. Entrega: aluno responde quiz e recebe roteiro personalizado. |
| 7    | Video Processing      | Pipeline de processamento de vídeo para o caminho 2A (Vídeo Modelado): upload → AssemblyAI (transcrição) → FFmpeg (frames) → IA (análise estrutural) → descrição textual. Entrega: aluno faz upload de vídeo de referência e a IA usa a análise para gerar roteiro modelado. |

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

1. Migration Prisma cria tabela `users` com campos: `id`, `email` (unique), `password_hash`, `credits` (int, default 0 — saldo de créditos do usuário), `created_at`, `updated_at`
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

1. Layout global com header contendo: logo/wordmark "SOL", badge de créditos do usuário logado, link "Meus Roteiros", link para comprar créditos, botão de logout
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

## Epic 2: Chat (Feature Complementar)

> Implementar o chat como feature complementar do SOL: interface de chat com streaming de respostas da OpenAI (GPT-4o/4o-mini), persistência do histórico de roteiros/conversas no banco, e estado inline de créditos insuficientes. O chat é utilizado para (a) iterar/refinar roteiros gerados pelo quiz, (b) discussões livres sobre criação de ofertas. A tela principal do produto agora é o quiz (Epic 6), não o chat.

### Story 2.1 — Database Schema: Conversations & Messages

As a developer,
I want the database schema for conversations and messages,
so that chat history can be persisted and retrieved.

**Acceptance Criteria:**

1. Migration Prisma cria tabela `conversations` com: `id`, `user_id` (FK → users), `title` (gerado da 1ª mensagem, max 60 chars), `quiz_session_id` (FK → quiz_sessions, nullable — null = chat livre/sem quiz), `created_at`
2. Migration cria tabela `messages` com: `id`, `conversation_id` (FK), `role` (enum: `user` | `assistant`), `content` (text), `created_at`
3. Relações Prisma corretamente tipadas — `user.conversations`, `conversation.messages`
4. Query de carregamento do histórico ordena mensagens por `created_at ASC`

### Story 2.2 — Chat UI: Interface e Histórico

As a student,
I want a full-screen chat interface that displays my conversation history,
so that I can read and continue my interactions naturally.

**Acceptance Criteria:**

1. Página `/chat` (protegida) exibe área de mensagens com scroll automático para a última mensagem. Chat é feature complementar — acessível a partir de um roteiro gerado (iteração) ou como "modo livre"
2. Mensagens do usuário e da IA visualmente diferenciadas (alinhamento, cor de fundo)
3. Input fixo no rodapé com botão de envio e atalho `Enter` para enviar (`Shift+Enter` pula linha)
4. Sidebar ou dropdown lista roteiros do usuário — clicar carrega o roteiro/conversa. Label "Meus Roteiros" no lugar de "Minhas Conversas"
5. Botão "Novo Roteiro" no header direciona para o quiz. Botão "Chat Livre" cria conversa sem quiz
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

### Story 2.4 — Estado Inline de Créditos Insuficientes (Done)

As a student with insufficient credits,
I want to see a clear inline prompt when I try to send a message,
so that I know exactly what to do to continue using SOL.

**Acceptance Criteria:**

1. Ao tentar enviar mensagem com saldo de créditos insuficiente para cobrir o custo máximo estimado em créditos (input + MAX_OUTPUT_TOKENS), `POST /api/chat` retorna `402 Payment Required`
2. Frontend exibe prompt inline no chat (não modal, não nova página): "Seus créditos são insuficientes. [Comprar créditos →]"
3. Link "Comprar créditos" redireciona para `/credits/buy`
4. Badge de créditos no header atualiza em tempo real após cada mensagem enviada com sucesso (via header `X-Credits-Remaining`)
5. Input do chat é desabilitado visualmente enquanto créditos são insuficientes

### Story 2.5 — Suporte a Anexos de Arquivos no Chat

As a student,
I want to attach files to my chat messages as additional context for the AI,
so that I can get more accurate and personalized creative scripts based on my existing materials.

**Acceptance Criteria:**

1. Input do chat aceita upload de até 3 arquivos por mensagem, com ou sem texto acompanhante
2. Tipos suportados — Imagens: JPEG, PNG, GIF, WEBP (processadas via OpenAI Vision API); Documentos de texto: PDF, TXT, MD (conteúdo extraído como texto plano); Documentos ricos: DOCX (conteúdo extraído como texto plano)
3. Tamanho máximo por arquivo: 10MB. Arquivos maiores são rejeitados com mensagem clara antes do upload
4. Conteúdo extraído de documentos limitado a 50.000 caracteres por arquivo. Se exceder, arquivo é REJEITADO com mensagem clara (nunca truncado silenciosamente)
5. PDFs escaneados (sem texto extraível) detectados e avisados ao aluno com sugestão de enviar como imagem ou digitar o conteúdo
6. Quando imagem é anexada, sistema força uso de GPT-4o (Vision API) independente do modelo padrão. Gate de custo máximo calcula com preço do modelo efetivamente usado (GPT-4o)
7. Tokens do conteúdo do arquivo (texto extraído para documentos, tokens fixos por resolução para imagens) somados aos tokens de input no cálculo do gate e da dedução real
8. Arquivos processados inteiramente em memória no backend — nunca persistidos em disco, storage externo ou banco de dados
9. Request com anexos enviado via `multipart/form-data`. Mensagens sem anexo continuam via `application/json` sem alteração
10. `CreditTransaction` de consumo registra: `hasAttachments` (Boolean), `attachmentTypes` (String[] — ex: `["image/jpeg", "application/pdf"]`), `attachmentTokens` (Int — tokens adicionais gerados pelos arquivos)
11. Nenhuma regressão em: streaming SSE, sistema de créditos, idempotência de webhooks, autenticação/sessão, mensagens sem anexo

---

## Epic 3: Créditos & Pagamentos

> Implementar o sistema de créditos por tokens (deducção por uso baseada em consumo real de tokens, saldo em tempo real) e a integração completa com Stripe — pacotes de créditos configuráveis, Checkout, PIX/cartão, webhooks e painel do usuário. Ao final deste epic, o SOL está monetizado e o ciclo completo de valor está fechado.

### Story 3.1 — Database Schema: Credits, Transactions, Pricing Config & Packages

As a developer,
I want the credit, transaction, pricing config and packages schema,
so that all credit movements are auditable, cost-trackable and consistent.

**Acceptance Criteria:**

1. Migration Prisma cria tabela `credit_transactions` com: `id`, `user_id` (FK), `amount` (int, em créditos — positivo = compra/adjustment, negativo = consumo), `type` (enum: `purchase` | `consumption` | `adjustment`), `description`, `stripe_payment_id` (nullable, unique), `input_tokens` (int, nullable — tokens de input consumidos), `output_tokens` (int, nullable — tokens de output consumidos), `model_used` (string, nullable — modelo OpenAI utilizado), `credits_per_m_input` (int, nullable — snapshot da config no momento do consumo), `credits_per_m_output` (int, nullable — snapshot da config no momento do consumo), `admin_email` (string, nullable — email do admin para adjustments), `has_attachments` (boolean, nullable), `attachment_types` (string[], nullable), `attachment_tokens` (int, nullable), `created_at`
2. Migration Prisma cria tabela `pricing_config` com: `id`, `key` (string, unique), `value` (int), `updated_at`, `updated_by` (string — email do admin). Seeds iniciais: `CREDITS_PER_M_INPUT=500`, `CREDITS_PER_M_OUTPUT=2000`, `MAX_OUTPUT_TOKENS=8192`
3. Migration Prisma cria tabela `credit_packages` com: `id`, `name` (string), `credits` (int), `price_in_cents` (int — preço em centavos de real para o Stripe), `active` (boolean, default true), `created_at`, `updated_at`. Seeds iniciais: Starter(100, 2990), Pro(500, 9990), Max(1200, 19990)
4. Coluna `credits` na tabela `users` (int, default 0) representa saldo atual de créditos — atualizada via transação atômica junto com insert em `credit_transactions`
5. Funções utilitárias em `packages/db`: `deductCredits(userId, creditsUsed, metadata: { inputTokens, outputTokens, modelUsed, creditsPerMInput, creditsPerMOutput, conversationTitle })` e `addCredits(userId, credits, stripePaymentId?)` com rollback em caso de saldo insuficiente
6. Saldo nunca fica negativo — o gate pré-chamada garante cobertura do pior caso antes de executar a chamada OpenAI
7. Função utilitária `getPricingConfig()` retorna as constantes de precificação da tabela `pricing_config`

### Story 3.2 — Deducção de Créditos Baseada em Tokens no Chat

As a product owner,
I want credits to be deducted based on real token consumption,
so that usage is metered accurately and sustainably.

**Acceptance Criteria:**

1. `POST /api/chat` conta tokens de input com precisão (system prompt + resumo das últimas 10 mensagens + mensagem nova) usando `tiktoken` **antes** de chamar a OpenAI
2. Backend busca constantes de precificação via `getPricingConfig()` (tabela `pricing_config`)
3. Calcula custo máximo estimado em créditos (gate): `maxCredits = max(1, ceil(inputTokens/1_000_000 × CREDITS_PER_M_INPUT + MAX_OUTPUT_TOKENS/1_000_000 × CREDITS_PER_M_OUTPUT))`
4. Verifica se `user.credits >= maxCredits`. Se insuficiente, retorna `402 Payment Required`
5. Se o saldo cobre o custo máximo, inicia stream OpenAI com `max_tokens: 8192`
6. Ao completar o stream, calcula créditos reais: `creditsUsed = max(1, ceil(inputTokens/1_000_000 × CREDITS_PER_M_INPUT + outputTokens/1_000_000 × CREDITS_PER_M_OUTPUT))`
7. Deduz créditos reais (não o estimado) via `deductCredits(userId, creditsUsed, { inputTokens, outputTokens, modelUsed, creditsPerMInput, creditsPerMOutput, conversationTitle })` em transação atômica
8. Se a chamada OpenAI falhar antes de produzir output, nenhum crédito é deduzido
9. Saldo nunca fica negativo — o gate garante que o saldo cobria o pior caso (8192 tokens), e o custo real é sempre ≤ pior caso
10. Header `X-Credits-Remaining` retornado em toda resposta de chat — frontend atualiza badge sem re-fetch
11. Logs de consumo registrados em `credit_transactions` com `type: consumption` e metadados completos (`inputTokens`, `outputTokens`, `modelUsed`, `creditsPerMInput`, `creditsPerMOutput`)

### Story 3.3 — Pacotes de Créditos & Stripe Checkout

As a student,
I want to choose a credit package and be redirected to a secure payment page,
so that I can buy credits easily.

**Acceptance Criteria:**

1. Página `/credits` lista pacotes disponíveis da tabela `credit_packages` (Starter: 100 créditos, Pro: 500, Max: 1200) — configuráveis via admin
2. `POST /api/payments/checkout` cria sessão Stripe Checkout com o pacote selecionado, retorna `sessionUrl`
3. Frontend redireciona para `sessionUrl` do Stripe
4. Stripe Checkout configurado para aceitar cartão de crédito e PIX
5. Página `/credits/success` exibe confirmação amigável pós-pagamento
6. Página `/credits/error` exibe mensagem de erro com link para tentar novamente

### Story 3.4 — Stripe Webhook: Processamento de Pagamentos

As a product owner,
I want successful payments to automatically add credits from the purchased package to the student's account,
so that the purchase flow is seamless and reliable.

**Acceptance Criteria:**

1. `POST /api/webhooks/stripe` valida assinatura do webhook com `STRIPE_WEBHOOK_SECRET`
2. Evento `checkout.session.completed` identifica o pacote comprado (via metadata do Checkout Session) e credita o número exato de créditos do pacote: `addCredits(userId, pacote.credits, stripePaymentId)`. Sem conversão, sem porcentagem
3. `CreditTransaction` registrada com `type: purchase`, `amount` = créditos do pacote, `stripePaymentId`
4. Idempotência garantida — `stripe_payment_id` tem constraint unique, duplo disparo não duplica créditos
5. Endpoint retorna `200` rapidamente (processamento síncrono, sem filas no MVP)
6. Falhas logadas com `stripe_payment_id` para reprocessamento manual se necessário

### Story 3.5 — Painel do Usuário

As a student,
I want a dashboard showing my credits, purchase history and conversation history,
so that I can track my usage and manage my account.

**Acceptance Criteria:**

1. Página `/dashboard` exibe: saldo atual de créditos, lista de `credit_transactions` com tipo, valor e data (paginada, 20/página), lista de roteiros com título e data (link para reabrir no chat de iteração)
2. Dados carregados via Server Components do Next.js 14
3. Link "Comprar mais créditos" em destaque quando saldo < 10
4. Layout consistente com o shell definido no Epic 1

---

## Epic 4: Admin & Operações

> Ferramentas de administração e operação do SOL: painel administrativo com métricas reais de usuários, uso e financeiras, mais ação de adição manual de créditos com auditoria completa. Inclui mudanças de schema (`adminEmail`, enum `adjustment`) e atualização do webhook Stripe. Ao final deste epic, o operador tem visibilidade financeira e operacional total do SOL.

### Story 4.1 — Painel Administrativo

As a SOL administrator,
I want an admin dashboard at /admin to monitor token usage per user and control the operation,
so that I have full visibility into product usage and can manage the platform effectively.

**Status:** Done — todos os critérios de aceite implementados.

**Acceptance Criteria:**

1. Enum `Role` (`USER`, `ADMIN`) adicionado ao schema Prisma e campo `role` no modelo `User` com default `USER`
2. Migration Prisma aplica sem erros e não afeta usuários existentes (default `USER`)
3. Middleware bloqueia acesso a `/admin` para qualquer usuário sem `role: ADMIN`, redirecionando para `/login`
4. Sessão JWT inclui `role` do usuário para verificação sem query extra ao banco
5. Seed script cria um usuário admin padrão para desenvolvimento local (ex: `admin@sol.com`)
6. Em produção, promoção a admin feita diretamente no banco via query segura: `UPDATE users SET role = 'ADMIN' WHERE email = '...'`
7. Página `/admin` exibe: lista de usuários com saldo de créditos, tokens consumidos e última atividade
8. Nenhuma regressão em auth, chat ou fluxo de créditos

### Story 4.2 — Admin Console: Métricas Operacionais e Financeiras

As a SOL administrator,
I want a comprehensive admin console at /admin with real metrics from the database,
so that I can monitor platform usage and financial performance, and manage credits manually.

**Acceptance Criteria:**

**Schema (pré-requisito)**
1. Enum `TransactionType` inclui valor `adjustment` (adição manual de créditos pelo admin) — já definido em Story 3.1
2. `CreditTransaction` com campo `adminEmail` (String, nullable) — email do admin executor; preenchido apenas em transações `adjustment` — já definido em Story 3.1
3. Migration Prisma aplica sem erros e sem impacto em transações existentes (campos nullable com default null)
4. Função `addCredits()` suporta dois modos: `{ type: 'purchase', stripePaymentId }` e `{ type: 'adjustment', adminEmail, motivo }`

**Métricas de Usuários**
5. Total de usuários cadastrados (COUNT users)
6. Usuários ativos nos últimos 7 dias — pelo menos 1 mensagem enviada (JOINing com messages)
7. Usuários sem saldo útil — `credits = 0`
8. Novos cadastros nos últimos 30 dias
9. Lista paginada de usuários (20/pág) exibindo: email, saldo atual em créditos, total de mensagens, data de cadastro

**Métricas de Uso**
10. Total de mensagens enviadas (histórico completo)
11. Mensagens enviadas hoje e nos últimos 7 dias
12. Total de tokens consumidos: input e output separados (SUM em credit_transactions WHERE type = 'consumption')
13. Modelo mais usado (gpt-4o vs gpt-4o-mini) com percentual sobre total de mensagens com consumo
14. Média de tokens por mensagem (input + output / total de mensagens com tipo consumption)
15. Total de mensagens com anexo (`hasAttachments = true`) vs sem anexo

**Métricas Financeiras**
16. Receita bruta total: calculada via JOINing `credit_transactions` (type=purchase) com `credit_packages` para obter `priceInCents`, em R$
17. Receita dos últimos 30 dias: idem com filtro de data
18. Custo OpenAI estimado via tokens consumidos e pricing da API OpenAI
19. Lucro bruto = Receita bruta − Custo OpenAI estimado
20. Margem bruta = (Lucro / Receita) × 100 (%)
21. Markup = (Receita / Custo) × 100 (%)
22. Créditos vendidos (SUM amount WHERE type = 'purchase') vs consumidos (SUM ABS(amount) WHERE type = 'consumption')
23. Saldo total de créditos retido na plataforma: `SUM(credits)` de todos os usuários

**Adição Manual de Créditos**
24. Formulário na página /admin: campo email do usuário + quantidade de créditos (inteiro) + motivo
25. Antes de executar, exibe confirmação: "Adicionar X créditos ao saldo de [email]?"
26. Execução via `POST /api/admin/add-credits`, acessível apenas para `role: ADMIN` (verificado server-side)
27. `CreditTransaction` registrada com: `type: adjustment`, `amount` = créditos, `adminEmail`, `description: "Ajuste manual por [adminEmail]: [motivo]"`, `stripePaymentId: null`
28. Saldo do usuário (`credits`) atualizado atomicamente junto com o insert da transação

**Restrições de Escopo (MVP)**
33. Sem gráficos ou charts — números e tabelas são suficientes
34. Sem exportação CSV/PDF
35. Sem CRUD de usuários (editar, deletar, bloquear)
36. Sem filtros de período customizado — apenas períodos fixos: hoje, 7d, 30d, histórico total
37. Dados carregados via Server Components Next.js — atualiza no refresh, sem real-time

**Qualidade e Consistência**
38. Visual dark/solar consistente com o restante do SOL (Tailwind + Shadcn/UI)
39. Todas as rotas `/api/admin/*` verificam `role: ADMIN` server-side (não apenas middleware)
40. Nenhuma regressão em: auth, chat, streaming SSE, webhook Stripe, painel do usuário (`/dashboard`)

---

## Epic 5.5: Pricing Admin

> Painel administrativo de precificação com simulador em tempo real e edição de constantes de precificação e pacotes de créditos. Ao final deste epic, o operador controla a precificação do SOL sem necessidade de deploy ou acesso ao banco de dados.

### Story 5.5.1 — CRUD de Constantes e Pacotes de Precificação

As a SOL administrator,
I want to edit pricing constants and credit packages via the admin panel,
so that I can adjust pricing without redeploying or accessing the database directly.

**Acceptance Criteria:**

1. Página `/admin/pricing` (protegida por `role: ADMIN`) exibe as constantes atuais de precificação (`CREDITS_PER_M_INPUT`, `CREDITS_PER_M_OUTPUT`, `MAX_OUTPUT_TOKENS`) lidas da tabela `pricing_config`
2. Admin pode editar cada constante inline com validação (valores inteiros positivos). Salvamento via `POST /api/admin/pricing-config`
3. Página lista todos os pacotes de créditos da tabela `credit_packages` com nome, créditos, preço em R$ e status (ativo/inativo)
4. Admin pode criar novo pacote, editar pacote existente e desativar/reativar pacotes. Pacotes inativos não aparecem na página de compra do aluno
5. Alterações em constantes entram em vigor imediatamente para novas mensagens. Transações passadas mantêm snapshot da config vigente (campos `creditsPerMInput`, `creditsPerMOutput` no `CreditTransaction`)
6. Toda alteração registra `updatedBy` (email do admin) e `updatedAt` na tabela `pricing_config`
7. Nenhuma regressão em: auth, chat, streaming SSE, webhook Stripe, painel do usuário

### Story 5.5.2 — Simulador de Precificação em Tempo Real

As a SOL administrator,
I want a real-time pricing simulator in the admin panel,
so that I can understand the financial impact of pricing changes before applying them.

**Acceptance Criteria:**

1. Seção "Simulador" na página `/admin/pricing` atualiza em tempo real conforme admin altera constantes de precificação
2. Exibe custo em créditos por perfil de mensagem: curta (~500 tokens I/O), média (~2000 tokens I/O), longa (~5000 tokens I/O), pesada (~8192 tokens output)
3. Exibe estimativa de mensagens por pacote (Starter, Pro, Max) para cada perfil
4. Exibe custo real OpenAI (USD) vs receita (R$) por perfil, baseado no pricing da API OpenAI
5. Exibe margem e markup por pacote
6. Simulador usa valores editados (não salvos) para preview — admin pode simular antes de aplicar
7. Visual consistente com dark/solar theme do SOL

---

## Epic 6: Quiz & Onboarding

> Experiência central do SOL: quiz estruturado que coleta contexto rico do aluno (produto, público, estilo, referências) e gera roteiro personalizado via IA. Inclui onboarding persistente com múltiplos perfis, quiz com caminhos condicionais (4 combinações), lógica condicional de perguntas, e geração de roteiro via OpenAI com streaming SSE. Ao final deste epic, o aluno responde o quiz e recebe um roteiro completo, podendo iterar via chat (Epic 2).

### Catálogo Completo de Perguntas (48 perguntas, 6 seções)

#### Seção 1: Onboarding — Cadastro Inicial (9 perguntas, preenchido 1 vez por perfil)

| # | Pergunta | Tipo | Opções / Detalhes |
|---|----------|------|-------------------|
| O1 | Descreva seu produto/serviço de forma detalhada | Aberta | Ex: "curso online de emagrecimento, R$197, entrego em videoaulas gravadas" |
| O2 | Promessa ou resultado que o produto entrega | Aberta | Ex: "perder 3kg em 5 dias com a dieta da selva" |
| O3 | Qual o público-alvo do seu produto? | Aberta | Ex: "mulheres 30-50 anos que querem emagrecer" |
| O4 | Qual a principal dor/problema do seu público? | Aberta | Ex: "não conseguem perder peso com dietas restritivas" |
| O5 | Qual seu diferencial competitivo? | Aberta | Ex: "método sem restrição alimentar com suporte individual" |
| O6 | O público já sabe que tem o problema que você resolve? | Seleção | A) Não sabem que tem o problema · B) Sabe que tem, mas não conhece soluções · C) Conhece soluções, mas não a sua · D) SOL define |
| O7 | Faixa de preço do produto | Seleção | A) Até R$97 · B) R$97–R$297 · C) R$297–R$997 · D) R$997–R$2.997 · E) +R$2.997 |
| O8 | Em qual(is) rede(s) social(is) você publica? | Seleção | A) Instagram · B) TikTok · C) Ambos · D) Outra |
| O9 | Já rodou anúncios pagos? | Seleção | A) Sim, ativamente · B) Sim, mas parei · C) Nunca · D) Pretendo começar |

#### Seção 2: Quiz Inicial — Definição de Caminhos (7 perguntas + 1 condicional, a cada nova produção)

| # | Pergunta | Tipo | Opções / Detalhes | Lógica |
|---|----------|------|-------------------|--------|
| Q1 | O que você deseja criar? | Ramificação | A) Anúncio Criativo → Caminho 1A · B) Vídeo Orgânico → Caminho 1B | Define path1 |
| Q2 | Modelar ou criar do zero? | Ramificação | A) Modelar (adaptar de vídeo existente) → Caminho 2A · B) Criar um roteiro do zero → Caminho 2B | Define path2 |
| Q3 | Aparecendo ou sem aparecer? | Condicional | A) Aparecendo · B) Sem aparecer → abre Q3.1 | Se B → mostra Q3.1, limita formatos |
| Q3.1 | Como pretende produzir? | Condicional (sub) | A) Fotos + narração · B) Banco de imagem · C) Gerado por IA · D) Texto animado | Só aparece se Q3 = B |
| Q4 | Descreva detalhadamente o nicho e o objetivo da produção | Aberta | Ex: "nicho da saúde, objetivo de atrair clientes para programa de perda de peso" | — |
| Q5 | Gênero predominante do público-alvo | Seleção | A) Homens (+60%) · B) Mulheres (+60%) · C) Ambos · D) SOL define | — |
| Q6 | Faixa etária do público-alvo | Seleção | A) 18–24 · B) 25–34 · C) 35–44 · D) 45–54 · E) 55+ · F) SOL define | — |
| Q7 | Plataforma principal de publicação | Seleção | A) Instagram Reels · B) TikTok · C) YouTube Shorts · D) Stories · E) Feed | — |

#### Seção 3: Caminho 1A — Anúncio Criativo (5 perguntas, se Q1 = A)

| # | Pergunta | Tipo | Opções |
|---|----------|------|--------|
| 1A.1 | Para qual tipo de público? | Seleção | A) Público frio — nunca viram seu conteúdo · B) Público morno — já interagiu · C) Público quente — já comprou · D) SOL define |
| 1A.2 | Para onde deseja enviar o público do criativo? | Seleção | A) WhatsApp · B) Página de vendas · C) Checkout direto · D) Formulário · E) VSL · F) Site · G) Perfil · H) Outro |
| 1A.3 | Já tem algum criativo que funcionou? Se sim, o que funcionou nele? | Aberta | Ex: "um vídeo com depoimento da aluna Maria converteu bem" |
| 1A.4 | Qual seu caixa para rodar anúncios atualmente? | Seleção | A) +R$20.000 · B) R$10k–R$19k · C) R$5k–R$9k · D) R$2k–R$4k · E) R$500–R$1,9k · F) Menos de R$499 |
| 1A.5 | Qual abordagem principal? | Seleção | A) Apresentar problema → solução · B) Resultado / prova social direto · C) Gerar curiosidade para o clique · D) Educar e depois direcionar · E) SOL define |

#### Seção 4: Caminho 1B — Vídeo Orgânico (3 perguntas, se Q1 = B)

| # | Pergunta | Tipo | Opções |
|---|----------|------|--------|
| 1B.1 | Para qual tipo de público? | Seleção | A) Topo de funil — viralizar e atrair novos seguidores · B) Meio de funil — educar e construir autoridade · C) Fundo de funil — converter público em venda · D) SOL define |
| 1B.2 | Qual objetivo de ganho principal com o vídeo? | Seleção | A) Ganhar seguidores · B) Gerar comentários · C) Ativar gatilho ("eu quero") · D) Compartilhamentos · E) Salvamentos · F) Clicar no link da bio · G) Outro |
| 1B.3 | Qual o tamanho aproximado da sua audiência atual? | Seleção | A) Menos de 1.000 · B) 1.000 a 10.000 · C) 10.000 a 50.000 · D) 50.000 a 200.000 · E) Mais de 200.000 |

#### Seção 5: Caminho 2A — Vídeo Modelado (13 perguntas, se Q2 = A)

| # | Pergunta | Tipo | Opções / Detalhes |
|---|----------|------|-------------------|
| 2A.1 | O vídeo referência é do mesmo nicho? | Seleção | A) É do mesmo nicho · B) Quero modelar de outro nicho |
| 2A.2 | Faça o upload do vídeo a ser modelado | Upload | Processamento: AssemblyAI (transcrição + speakers + emoção) → FFmpeg (frames visuais) → IA (ganchos + CTA + estrutura) |
| 2A.3 | Contexto do áudio do vídeo referência | Seleção | A) Pessoa(s) falando · B) Falando + música de fundo · C) Narrado (voz off) · D) Texto na tela · E) Apenas música · F) Outro |
| 2A.4 | Em qual formato deseja produzir? | Seleção | A) Formato idêntico ao do vídeo referência · B) Perguntas e respostas · C) Classificação · D) Isso ou aquilo · H) Low-fi · M) Dicas e tutoriais · N) Curiosidades · O) SOL define (+ 8 formatos adicionais) |
| 2A.5 | Emoção que o vídeo referência te gerou | Seleção | A) Raiva · B) Indignação · C) Medo · D) Curiosidade · E) Surpresa · F) Vergonha · G) Desejo · H) Identidade · I) Urgência · J) Medo de perder · K) Esperança |
| 2A.6 | 3 comentários mais curtidos do vídeo referência | Aberta (opcional) | Campos: 1→, 2→, 3→ |
| 2A.7 | O que do vídeo referência funcionou especialmente bem? | Aberta (opcional) | Ex: "o gancho dos primeiros 3 segundos" |
| 2A.8 | Qual tom de comunicação? | Seleção | A) Mesmo do vídeo ref. · B) Direto e agressivo · C) Leve e didático · D) Empático · E) Provocador · F) Inspirador · G) Técnico · H) Outro |
| 2A.9 | Como você descreveria o LOCAL do vídeo? | Aberta | Ex: "começa na cozinha, depois a câmera muda para o corredor" |
| 2A.10 | O que mais prendeu sua atenção no vídeo? | Aberta | Ex: "pessoa falando com a barriga de alguém" |
| 2A.11 | CTA desejado no roteiro | Aberta | Ex: "link na bio", "comenta EU QUERO" |
| 2A.12 | Deseja utilizar prova social? | Seleção + texto | A) Sim, em foto · B) Sim, falando · C) Sim, vídeo curto · D) Não utilizar. Se sim → campo para descrever |
| 2A.13 | Algo que NÃO gostou ou mudaria no vídeo referência? | Aberta | Ex: "achei que demorou pra chegar no ponto", "CTA fraco" |

#### Seção 6: Caminho 2B — Vídeo do Zero (11 perguntas, se Q2 = B)

| # | Pergunta | Tipo | Opções / Detalhes |
|---|----------|------|-------------------|
| 2B.1 | Descreva detalhadamente o tema principal do vídeo | Aberta | Ex: "Sou nutricionista e quero ensinar uma receita para perder peso" |
| 2B.2 | Qual emoção deseja provocar? | Seleção | A) Raiva · B) Indignação · C) Medo · D) Curiosidade · E) Surpresa/Quebra · G) Desejo · H) Identidade · K) Esperança |
| 2B.3 | Tem um gancho em mente? | Aberta | Ex: "como eu perdi 3kg com uma única mudança na alimentação" |
| 2B.4 | Qual tipo de gancho quer? | Seleção | A) Pergunta provocativa · B) Afirmação chocante · C) Resultado surpreendente · D) Mito quebrado · E) SOL define |
| 2B.5 | Local onde será gravado | Aberta | Ex: "em casa, no escritório" |
| 2B.6 | Em qual formato será feito? | Seleção | A) SOL define · B) Perguntas e respostas · C) Classificação · H) Low-fi · M) Dicas e tutoriais · N) Curiosidades (+ exemplos em vídeo na interface) |
| 2B.7 | Duração desejada aproximadamente | Seleção | A) Até 15s · B) 16–30s · C) 31–60s · D) 61–90s · E) 91–120s · F) 121–150s |
| 2B.8 | CTA desejado | Aberta | Ex: "link na bio", "comenta EU QUERO" |
| 2B.9 | Tom de comunicação | Seleção | A) Direto e agressivo · B) Leve e didático · C) Empático · D) Provocador · E) Inspirador · F) Técnico · G) Outro |
| 2B.10 | Deseja utilizar prova social? | Seleção + texto | A) Sim, em foto · B) Sim, falando · C) Sim, vídeo curto · D) Não utilizar |
| 2B.11 | Algo que NÃO quer no vídeo? | Aberta (opcional) | Ex: "não quero parecer vendedor", "não quero dancinhas" |

### Lógica de Caminhos e Combinações

```
ONBOARDING (9 perguntas, 1 vez por perfil)
    ↓
QUIZ INICIAL (7+1 perguntas)
    ├─ Q1 = A → CAMINHO 1A: Anúncio Criativo (5 perguntas)
    ├─ Q1 = B → CAMINHO 1B: Vídeo Orgânico (3 perguntas)
    ├─ Q2 = A → CAMINHO 2A: Vídeo Modelado (13 perguntas, inclui upload)
    └─ Q2 = B → CAMINHO 2B: Vídeo do Zero (11 perguntas)

4 combinações possíveis:
  1A + 2A → Anúncio Criativo + Vídeo Modelado
  1A + 2B → Anúncio Criativo + Vídeo do Zero
  1B + 2A → Vídeo Orgânico + Vídeo Modelado
  1B + 2B → Vídeo Orgânico + Vídeo do Zero

Lógica condicional:
  Q3 = "Sem aparecer" (B) → Exibe Q3.1 (formato de produção), limita formatos disponíveis
```

### Story 6.1 — Database Schema: Onboarding & Quiz

As a developer,
I want the database schema for onboarding profiles, quiz sessions and quiz answers,
so that quiz data can be persisted and used for script generation.

**Acceptance Criteria:**

1. Migration Prisma cria tabela `onboarding_profiles` com: `id`, `user_id` (FK → users), `name` (nome do produto/nicho), `answers` (JSON — respostas das 9 perguntas), `created_at`, `updated_at`
2. Migration cria tabela `quiz_sessions` com: `id`, `user_id` (FK), `onboarding_profile_id` (FK), `path1` (enum: `AD` | `ORGANIC`), `path2` (enum: `MODELED` | `FROM_SCRATCH`), `status` (enum: `IN_PROGRESS` | `COMPLETED` | `ABANDONED`), `created_at`, `completed_at`
3. Migration cria tabela `quiz_answers` com: `id`, `quiz_session_id` (FK), `section` (enum: `INITIAL` | `AD_CREATIVE` | `ORGANIC_VIDEO` | `MODELED_VIDEO` | `FROM_SCRATCH_VIDEO`), `question_key` (string), `answer_type` (enum: `TEXT` | `SINGLE_SELECT` | `MULTI_SELECT` | `UPLOAD`), `answer_value` (text), `created_at`
4. Campo `quiz_session_id` (FK, nullable) adicionado à tabela `conversations` — null = chat livre
5. Relações: `user.onboardingProfiles`, `user.quizSessions`, `quizSession.answers`, `quizSession.conversation`
6. Seed script cria perfis de onboarding e quiz sessions de teste

### Story 6.2 — Onboarding: Perfil Persistente do Aluno

As a student,
I want to fill out my product profile once and reuse it across all future productions,
so that I don't have to repeat the same information every time.

**Acceptance Criteria:**

1. Página `/onboarding` exibe formulário com as 9 perguntas de onboarding
2. Aluno pode ter múltiplos perfis de onboarding (um por produto/nicho)
3. CRUD completo: criar, editar, deletar perfis via API (`POST/GET/PUT/DELETE /api/onboarding`)
4. Antes de cada quiz, aluno seleciona perfil existente ou cria novo
5. Dados do onboarding persistem e são reutilizados em todas as produções futuras
6. Interface responsiva (mobile + desktop) com visual dark/solar

### Story 6.3 — Quiz Engine: Renderização e Lógica Condicional

As a student,
I want to answer a structured quiz that adapts based on my choices,
so that the AI gets exactly the right context to generate my script.

**Acceptance Criteria:**

1. Componente `quiz-engine` renderiza perguntas dinamicamente por tipo (aberta, seleção, upload)
2. Definição das 48 perguntas em arquivo TypeScript com schema: `questionKey`, `section`, `type`, `title`, `example`, `options`, `showWhen` (lógica condicional)
3. Lógica condicional funcional: Q3="B" → mostra Q3.1 e limita formatos
4. Ramificação Q1 direciona para seção 1A ou 1B; Q2 direciona para seção 2A ou 2B
5. Barra de progresso por seção (ex: "3 de 7")
6. Navegação entre seções (sidebar e botões prev/next)
7. Respostas salvas via `POST /api/quiz/answer` — salvamento automático a cada resposta
8. `GET /api/quiz/session/:id` retorna estado atual do quiz com respostas já dadas

### Story 6.4 — Quiz UI: Interface Mobile e Desktop

As a student,
I want a beautiful, responsive quiz interface on both mobile and desktop,
so that I can create scripts from any device.

**Acceptance Criteria:**

1. Interface dual (mobile + desktop) conforme apresentação (quiz-structure-v2.html)
2. Sidebar de navegação por seções com estado de progresso (completed, active, locked)
3. Tipos de pergunta visualmente distintos: texto aberto (textarea), seleção única (cards), seleção múltipla (checkboxes), upload (drag & drop)
4. Visual dark/solar consistente com o resto do SOL (Tailwind + Shadcn/UI)
5. Transições suaves entre perguntas e seções
6. Estado de loading durante salvamento de respostas
7. Indicação visual de perguntas obrigatórias vs opcionais

### Story 6.5 — Geração de Roteiro via Quiz

As a student,
I want the AI to generate a complete script based on all my quiz answers,
so that I get a personalized creative script without writing prompts manually.

**Acceptance Criteria:**

1. `POST /api/quiz/generate` coleta TODO o contexto: onboarding profile + quiz answers + video analysis (se 2A)
2. Monta prompt estruturado com 4 system prompts diferentes por combinação de caminhos (AD+MODELED, AD+SCRATCH, ORGANIC+MODELED, ORGANIC+SCRATCH)
3. Chamada OpenAI com streaming SSE (mesma infra do chat — Epic 2)
4. Gate de créditos funciona igual: `calculateMaxCredits(totalInputTokens, config)` → verificar saldo → deduzir real após completar
5. Cria `Conversation` (Roteiro) com `quizSessionId` preenchido
6. Primeira mensagem `assistant` na Conversation = roteiro completo gerado
7. Aluno é redirecionado para `/roteiros/[id]` para visualizar e iterar
8. `CreditTransaction` registrada com metadados completos (tokens, modelo, snapshot config)

### Story 6.6 — "Meus Roteiros": Listagem e Visualização

As a student,
I want to see all my generated scripts in one place,
so that I can review, iterate and manage my creative scripts.

**Acceptance Criteria:**

1. Página `/roteiros` lista roteiros gerados (Conversations com `quizSessionId` preenchido) + chats livres
2. Cada roteiro mostra: título, data, caminhos usados (ex: "Anúncio + Modelado"), número de mensagens
3. Clicar abre `/roteiros/[id]` com roteiro + chat de iteração
4. Renomear "Conversas" para "Roteiros" em toda a interface (header, sidebar, painel do usuário)
5. Filtro ou separação visual entre roteiros (vindos do quiz) e chats livres
6. Paginação (20 por página) e ordenação por data (mais recente primeiro)

### Story 6.7 — Chat de Iteração sobre Roteiro

As a student,
I want to refine my generated script through chat,
so that I can adjust specific parts without redoing the entire quiz.

**Acceptance Criteria:**

1. Após geração, aluno pode enviar mensagens no mesmo Conversation para iterar/refinar
2. Reutiliza componentes de chat existentes (Epic 2)
3. System prompt inclui contexto completo: respostas do quiz + roteiro gerado
4. Créditos deduzidos por mensagem (mesma lógica do FR5)
5. Cada mensagem adicional é uma iteração — não regera o roteiro, apenas ajusta
6. Histórico completo visível: roteiro original (1ª mensagem assistant) + iterações subsequentes

---

## Epic 7: Video Processing

> Pipeline de processamento de vídeo para o caminho 2A (Vídeo Modelado). Epic separado por ser infraestrutura pesada e independente do quiz. Fluxo: upload → armazenamento temporário → AssemblyAI (transcrição + speakers + emoção) → FFmpeg (extração de frames) → IA (análise visual e estrutural) → descrição textual consolidada → vídeo deletado. A descrição textual é o que persiste e alimenta a geração do roteiro. Ao final deste epic, o aluno pode fazer upload de um vídeo de referência no caminho 2A e a IA usa a análise para gerar roteiro modelado.

### Story 7.1 — Infraestrutura de Processamento de Vídeo

As a developer,
I want the video processing infrastructure set up in Docker,
so that video uploads can be processed in the pipeline.

**Acceptance Criteria:**

1. FFmpeg instalado no Docker container (`apt-get install ffmpeg` no Dockerfile)
2. Diretório temporário configurável via `VIDEO_TEMP_DIR` (default: `/tmp/sol-uploads/`)
3. Cleanup automático de arquivos temporários após processamento (via `try/finally`)
4. Limites configuráveis: `VIDEO_MAX_DURATION_SECONDS=300` (5 min), `VIDEO_MAX_SIZE_MB=500`
5. AssemblyAI SDK (`assemblyai`) instalado e configurado com `ASSEMBLYAI_API_KEY`
6. Novas env vars documentadas no `.env.example`
7. Volume temporário no `docker-compose.yml` se necessário

### Story 7.2 — Database Schema: Video Analysis

As a developer,
I want the database schema for video analysis results,
so that processed video data can be stored and used for script generation.

**Acceptance Criteria:**

1. Migration Prisma cria tabela `video_analyses` com: `id`, `quiz_session_id` (FK), `quiz_answer_id` (FK — pergunta de upload 2A.2), `transcription` (text — output AssemblyAI), `frame_descriptions` (text — output análise de frames), `structure_analysis` (text — output IA: ganchos, CTA, cortes), `full_description` (text — descrição consolidada), `processing_status` (enum: `QUEUED` | `PROCESSING` | `COMPLETED` | `FAILED`), `processing_time_ms` (int), `error_message` (text, nullable), `created_at`
2. Relações: `quizSession.videoAnalysis`, `quizAnswer.videoAnalysis`
3. `full_description` é o campo que alimenta a geração do roteiro — contém descrição textual rica consolidando transcrição + frames + análise estrutural

### Story 7.3 — Upload de Vídeo com Progresso

As a student,
I want to upload a reference video and see the processing progress,
so that I know the system is analyzing my video.

**Acceptance Criteria:**

1. UI de upload na pergunta 2A.2 (Vídeo Modelado): drag & drop + seleção de arquivo
2. Validação client-side: tipo de vídeo (mp4, mov, avi, webm), tamanho ≤ 500MB, duração ≤ 5min
3. Progresso de upload visível (barra de progresso)
4. `POST /api/video/upload` recebe multipart e salva em temp. Retorna `videoAnalysisId`
5. `GET /api/video/status/[id]` retorna status do processamento (QUEUED → PROCESSING → COMPLETED/FAILED)
6. Frontend faz polling do status e exibe progresso com mensagens amigáveis
7. Se falhar, exibe erro amigável com opção de retry

### Story 7.4 — Pipeline de Processamento: Transcrição + Frames

As a developer,
I want the video to be automatically transcribed and have frames extracted,
so that the AI can analyze the video content.

**Acceptance Criteria:**

1. Após upload, inicia processamento assíncrono
2. AssemblyAI: envio do vídeo → transcrição com speakers e sentiment → salva `transcription` no banco
3. FFmpeg: extrai frames do vídeo (1 frame a cada 5 segundos) → salva temporariamente
4. Error handling para cada etapa: se AssemblyAI falhar → FAILED com mensagem, se FFmpeg falhar → FAILED com mensagem
5. Timeout total: 3 minutos — se exceder, marca como FAILED com "Processamento excedeu o tempo limite"
6. Atualiza `processing_status` no banco a cada etapa (QUEUED → PROCESSING → ...)
7. Resultados intermediários salvos no `VideoAnalysis`

### Story 7.5 — Análise IA do Vídeo

As a developer,
I want the AI to analyze the transcription and frames to generate a rich description,
so that the script generation has maximum context from the reference video.

**Acceptance Criteria:**

1. Pega `transcription` + frames extraídos → envia para GPT-4o Vision (análise de frames: o que aparece visualmente)
2. GPT-4o consolida tudo: ganchos usados, CTAs, estrutura do vídeo, tom de comunicação, técnicas de retenção → gera `full_description` textual
3. Salva `frame_descriptions`, `structure_analysis` e `full_description` no `VideoAnalysis`
4. Deleta arquivo temporário de vídeo e frames via `try/finally`
5. Marca `processing_status = COMPLETED`, registra `processing_time_ms`
6. `full_description` é o que alimenta o prompt de geração do roteiro (Story 6.5)
7. Créditos do processamento de vídeo (tokens de input/output da análise por IA) incluídos no custo total da geração do roteiro

---

## Checklist Results Report

### Category Statuses

| Category                         | Status  | Notes                                                                                                          |
| -------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| 1. Problem Definition & Context  | ✅ PASS | Problema claro (saturação leilão), audiência específica (alunos Space), métrica de sucesso mensurável (<30min) |
| 2. MVP Scope Definition          | ✅ PASS | In/out of scope explícitos, foco correto em chat + auth + créditos + pagamento                                 |
| 3. User Experience Requirements  | ✅ PASS | Flows primários documentados, telas definidas, estado de erro (inline) especificado                            |
| 4. Functional Requirements       | ✅ PASS | FR1–FR27 testáveis, cobrindo todos os flows do MVP + quiz + onboarding + video + anexos + admin               |
| 5. Non-Functional Requirements   | ✅ PASS | Performance (3s streaming), segurança (JWT, bcrypt), infra (Docker, VPS), zeroing lock-in                      |
| 6. Epic & Story Structure        | ✅ PASS | 7 epics (incl. 5.5, 6, 7), stories dimensionadas para sessão de agente, ACs testáveis                          |
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

### Architect Prompt (v2.0)

> @architect — O PRD do SOL foi atualizado para v9.0 (`docs/prd.md`). O produto evoluiu de chat-first para quiz-first + chat complementar. Atualize `docs/architecture.md` para v2.0. Novos data models: OnboardingProfile, QuizSession, QuizAnswer, VideoAnalysis. Quiz engine com lógica condicional. Pipeline de vídeo: AssemblyAI + FFmpeg + IA. Novos API routes para quiz, onboarding e vídeo. Docker updates para FFmpeg. 4 system prompts por combinação de caminhos.

### Scrum Master Prompt

> @sm — O PRD (v9.0) e a Arquitetura (v2.0) do SOL foram atualizados. Crie user stories para Epic 6 (Quiz & Onboarding — 7 stories: 6.1–6.7) e Epic 7 (Video Processing — 5 stories: 7.1–7.5). Siga o padrão das stories existentes em `docs/stories/`. Documente alterações em stories existentes impactadas (2.1, 2.2, 1.4, 3.5).
