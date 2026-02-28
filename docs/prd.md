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
| 2026-02-26 | 2.0     | Novo modelo de precificação: créditos como unidade monetária interna com custo variável por mensagem baseado em consumo real de tokens e cotação USD-BRL diária. Atualização de FR5, FR6, FR7, FR9, NFR4, Technical Assumptions, Stories 3.1 e 3.2. | Morgan (PM) |
| 2026-02-26 | 2.1     | Alinhamento com refinamento do @architect: User.credits → balanceCents + minBalanceCents, CreditTransaction com inputTokens/outputTokens/costUsd, ExchangeRate com currency+date (@@unique), funções getExchangeRate/updateExchangeRate, header X-Balance-Remaining | Morgan (PM) |
| 2026-02-27 | 3.0     | Adição do Epic 4 (Admin & Operações) com Story 4.1 (Painel Administrativo). Documenta funcionalidade /admin já implementada e define critérios de aceite para proteção de rota com role-based access control. | Morgan (PM) |
| 2026-02-27 | 4.0     | Novo modelo de precificação: gate pré-chamada estima custo máximo (input real + MAX_OUTPUT_TOKENS=8192 × taxa), saldo nunca fica negativo. Remoção do conceito `minBalanceCents`. `CREDIT_PERCENTAGE` substitui `CREDIT_MARGIN_PERCENT`. Atualização de FR5, FR6, FR9, Technical Assumptions, Stories 3.1, 3.2, 3.4, 3.6. | Morgan (PM) |
| 2026-02-27 | 5.0     | Adição de FR11 (Suporte a Anexos no Chat) e Story 2.5. Aluno pode anexar imagens (Vision API, forçando GPT-4o) e documentos (PDF, TXT, MD, DOCX) com extração de texto. Limites: 3 arquivos/msg, 10MB/arquivo, 50k chars/doc. Processamento in-memory, sem persistência. Custo de tokens do anexo incluído no gate e dedução real. Novos campos de auditoria: `hasAttachments`, `attachmentTypes`, `attachmentTokens`. | Morgan (PM) |

---

## Requirements

### Functional

- **FR1:** O sistema deve permitir que usuários se cadastrem e façam login com email e senha via NextAuth.js v5 (Credentials Provider)
- **FR2:** O sistema deve manter sessão autenticada via JWT em cookie httpOnly
- **FR3:** O usuário autenticado deve ter acesso a um chat conversacional com IA para geração de ofertas e scripts de criativos
- **FR4:** O chat deve enviar mensagens para a API da OpenAI (GPT-4o para outputs finais, GPT-4o-mini para iterações) e retornar respostas via streaming (Server-Sent Events)
- **FR5:** O sistema deve calcular o custo máximo estimado da mensagem (tokens de input reais + MAX_OUTPUT_TOKENS=8192 tokens de output × taxa do modelo), verificar se o saldo cobre esse custo máximo, executar a chamada OpenAI se coberto, e deduzir o custo real (baseado em tokens efetivamente consumidos) após o streaming completar
- **FR6:** O usuário deve ser bloqueado de enviar novas mensagens quando seu saldo interno for insuficiente para cobrir o custo máximo estimado (input real + 8192 tokens de output × taxa do modelo × cotação USD-BRL)
- **FR7:** O usuário deve poder visualizar seu saldo em créditos e uma estimativa aproximada de scripts restantes no painel do usuário. O aluno NÃO visualiza custo por mensagem, cotação ou saldo em reais
- **FR8:** O sistema deve permitir a compra de pacotes de créditos via Stripe Checkout (cartão e PIX)
- **FR9:** O sistema deve processar webhooks do Stripe para confirmar pagamentos e creditar o saldo interno do usuário no banco de dados. Uma porcentagem configurável do valor pago (`CREDIT_PERCENTAGE`, inicialmente 40%) é disponibilizada como saldo interno em centavos de real para consumo nas chamadas da OpenAI
- **FR10:** O usuário deve ter acesso a um painel básico com: saldo de créditos, histórico de compras e histórico de conversas
- **FR11:** O aluno pode anexar até 3 arquivos por mensagem (imagens: JPEG, PNG, GIF, WEBP; documentos: PDF, TXT, MD, DOCX; máx 10MB cada) como contexto adicional para a IA. Imagens processadas via OpenAI Vision API (forçando GPT-4o). Documentos têm conteúdo extraído como texto (limite 50.000 caracteres — rejeitado se exceder, nunca truncado). Arquivos processados em memória sem persistência. Custo em créditos inclui tokens dos anexos no gate e na dedução real

### Non Functional

- **NFR1:** A stack deve seguir arquitetura zero lock-in — Next.js 14 + Prisma + PostgreSQL + Docker, sem uso de Supabase, Firebase, Vercel (produção) ou qualquer BaaS
- **NFR2:** Todo código deve ser TypeScript strict mode — sem `any`, sem `as unknown`
- **NFR3:** O tempo de resposta da primeira palavra via streaming do chat não deve exceder 3 segundos em condições normais de rede
- **NFR4:** A lógica de consumo de créditos deve ser implementada no banco (PostgreSQL + Prisma), nunca no Stripe. A cotação USD-BRL deve ser consultada diariamente via API externa (AwesomeAPI) e armazenada na tabela `exchange_rates` (com constraint `@@unique([currency, date])`). Cada `credit_transaction` deve registrar `exchange_rate`, `input_tokens`, `output_tokens`, `model_used` e `cost_usd` para auditoria completa
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
3. **Prompt inline de créditos insuficientes** — ao tentar enviar com saldo insuficiente para cobrir o custo máximo estimado, aparece prompt inline no chat (não modal, não página separada) com CTA direto para compra de créditos
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
- **Pagamentos:** Stripe Checkout + Webhooks. PIX + cartão. Lógica de créditos 100% no PostgreSQL (`credit_transactions`), nunca no Stripe. Webhook credita porcentagem configurável do valor pago (`CREDIT_PERCENTAGE`, inicialmente 40%) como saldo interno em centavos de real.
- **IA:** OpenAI GPT-4o para outputs finais, GPT-4o-mini para iterações intermediárias. Streaming via Server-Sent Events (não WebSockets). Contagem precisa de tokens via `tiktoken` para cálculo de custo real por mensagem. Parâmetro `max_tokens: 8192` — teto de segurança para limitar custo máximo por resposta, não limitador de qualidade (respostas típicas usam 200-2000 tokens). Contexto enviado: system prompt + resumo das últimas 10 mensagens + mensagem atual.
- **Cotação cambial:** Cotação USD-BRL consultada diariamente via AwesomeAPI (`https://economia.awesomeapi.com.br/json/last/USD-BRL`) e armazenada em tabela `exchange_rates`. Fallback: última cotação salva; se não existir, usa variável de ambiente `FALLBACK_USD_BRL_RATE`.
- **Modelo de custo por mensagem:** Gate pré-chamada: `maxCostUsd = inputTokens × preço_input + MAX_OUTPUT_TOKENS × preço_output`, converte para centavos e verifica se saldo cobre. Se cobrir, executa chamada OpenAI com `max_tokens: 8192`. Após streaming, calcula custo real: `costUsd = inputTokens × preço_input + outputTokens_reais × preço_output`. Dedução: `costCents = max(Math.ceil(costUsd × exchangeRate × 100), MIN_COST_CENTS)` onde `MIN_COST_CENTS = 100` (1 crédito mínimo por mensagem). Cada transação registra `exchangeRate`, `inputTokens`, `outputTokens`, `modelUsed` e `costUsd` para rastreabilidade completa.
- **Constantes de precificação:** `MAX_OUTPUT_TOKENS = 8192` (teto de segurança para estimativa de custo máximo e parâmetro `max_tokens` da OpenAI). `MIN_COST_CENTS = 100` (custo mínimo por mensagem = 1 crédito).
- **Proteções:** Saldo negativo é matematicamente impossível. O gate pré-chamada garante que o saldo cobre o pior caso (input real + 8192 tokens de output). Como o custo real é sempre ≤ custo estimado e o saldo cobria o estimado, o saldo após dedução é sempre ≥ 0. Conceito de `minBalanceCents` removido — não é mais necessário.
- **Infraestrutura:** VPS própria, Docker Compose, GitHub Actions para CI/CD. Proibido: Vercel produção, Railway, Render.
- **Idioma do código:** TypeScript strict mode. Sem `any`. Sem `as unknown`.
- **Variáveis sensíveis:** sempre em `.env`, nunca hardcodadas. Inclui: `FALLBACK_USD_BRL_RATE`, `CREDIT_PERCENTAGE` (porcentagem do valor pago disponibilizada como saldo, inicialmente 40).
- **Anexos no chat:** Suporte a upload de arquivos como contexto para a IA. Imagens (JPEG, PNG, GIF, WEBP) processadas via OpenAI Vision API — forçam uso de GPT-4o independente do modelo padrão. Documentos (PDF, TXT, MD, DOCX) têm conteúdo extraído como texto plano em memória — nunca persistidos em disco ou storage externo. Limites: 10MB/arquivo, 3 arquivos/mensagem, 50.000 caracteres/documento (rejeitado com mensagem clara se exceder, nunca truncado). PDFs escaneados (sem texto extraível) detectados e avisados ao aluno. Tokens de anexos somados ao input para cálculo de gate e custo real. `CreditTransaction` registra `hasAttachments` (Boolean), `attachmentTypes` (String[]) e `attachmentTokens` (Int) para auditoria. Request com anexo enviado via `multipart/form-data`; sem anexo, mantém `application/json` sem alteração.

---

## Epic List

| Epic | Title                 | Goal                                                                                                                                                                          |
| ---- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Foundation & Auth     | Estabelecer infraestrutura (Turborepo, Docker, PostgreSQL, CI/CD) e autenticação completa (NextAuth.js v5). Entrega: produto deployado com login funcional.                   |
| 2    | Chat Core com IA      | Implementar chat com streaming OpenAI, persistência de histórico e estado inline de créditos insuficientes. Entrega: aluno pode conversar com a IA e receber ofertas ao vivo. |
| 3    | Créditos & Pagamentos | Implementar sistema de créditos, Stripe Checkout + PIX/cartão, webhooks e painel do usuário. Entrega: SOL monetizado, ciclo de valor fechado.                                 |
| 4    | Admin & Operações     | Ferramentas de administração e operação do SOL: painel admin com visibilidade de uso, controle de usuários e monitoramento de tokens/custos. Entrega: operador tem controle total do produto. |

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

1. Migration Prisma cria tabela `users` com campos: `id`, `email` (unique), `password_hash`, `balance_cents` (int, default 0 — saldo interno em centavos de real), `created_at`, `updated_at`
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

### Story 2.4 — Estado Inline de Créditos Insuficientes (Done)

As a student with insufficient credits,
I want to see a clear inline prompt when I try to send a message,
so that I know exactly what to do to continue using SOL.

**Acceptance Criteria:**

1. Ao tentar enviar mensagem com saldo insuficiente para cobrir o custo máximo estimado (input + MAX_OUTPUT_TOKENS), `POST /api/chat` retorna `402 Payment Required`
2. Frontend exibe prompt inline no chat (não modal, não nova página): "Seus créditos são insuficientes. [Comprar créditos →]"
3. Link "Comprar créditos" redireciona para `/credits/buy`
4. Badge de créditos no header atualiza em tempo real após cada mensagem enviada com sucesso (via header `X-Balance-Remaining`)
5. Input do chat é desabilitado visualmente enquanto `balanceCents` é insuficiente

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
11. Nenhuma regressão em: streaming SSE, sistema de cotação cambial, idempotência de webhooks, autenticação/sessão, mensagens sem anexo

---

## Epic 3: Créditos & Pagamentos

> Implementar o sistema de créditos (deducção por uso, saldo em tempo real) e a integração completa com Stripe — pacotes de créditos, Checkout, PIX/cartão, webhooks e painel do usuário. Ao final deste epic, o SOL está monetizado e o ciclo completo de valor está fechado.

### Story 3.1 — Database Schema: Credits, Transactions & Exchange Rates

As a developer,
I want the credit, transaction and exchange rate schema,
so that all credit movements are auditable, cost-trackable and consistent.

**Acceptance Criteria:**

1. Migration Prisma cria tabela `credit_transactions` com: `id`, `user_id` (FK), `amount` (int, em centavos de real — positivo = crédito, negativo = débito), `type` (enum: `purchase` | `consumption`), `description`, `stripe_payment_id` (nullable, unique), `exchange_rate` (Decimal, nullable — cotação USD-BRL no momento da transação), `input_tokens` (int, nullable — tokens de input consumidos), `output_tokens` (int, nullable — tokens de output consumidos), `model_used` (string, nullable — modelo OpenAI utilizado), `cost_usd` (Decimal, nullable — custo em dólar da chamada OpenAI), `created_at`
2. Migration Prisma cria tabela `exchange_rates` com: `id`, `currency` (string — ex: "USD-BRL"), `rate` (Decimal — cotação), `date` (DateTime @db.Date — data sem horário), `created_at`. Constraint: `@@unique([currency, date])`
3. Coluna `balance_cents` na tabela `users` representa saldo interno atual em centavos de real — atualizada via transação atômica junto com insert em `credit_transactions`
4. Funções utilitárias em `packages/db`: `deductCredits(userId, costCents, metadata: { exchangeRate, inputTokens, outputTokens, modelUsed, costUsd, conversationTitle })` e `addCredits(userId, amountCents, stripePaymentId, exchangeRate?)` com rollback em caso de saldo insuficiente
5. Saldo nunca fica negativo — o gate pré-chamada garante cobertura do pior caso antes de executar a chamada OpenAI
6. Funções utilitárias `getExchangeRate(currency)` (retorna cotação do dia, fallback para última disponível ou `FALLBACK_USD_BRL_RATE`) e `updateExchangeRate(currency, rate)` (upsert na tabela para a data de hoje)

### Story 3.2 — Deducção de Crédito Baseada em Tokens no Chat

As a product owner,
I want credits to be deducted based on real token consumption and daily exchange rate,
so that usage is metered accurately and sustainably.

**Acceptance Criteria:**

1. `POST /api/chat` conta tokens de input com precisão (system prompt + resumo das últimas 10 mensagens + mensagem nova) usando `tiktoken` **antes** de chamar a OpenAI
2. Backend busca cotação do dia via `getExchangeRate("USD-BRL")`
3. Calcula custo máximo estimado (gate): `maxCostUsd = inputTokens × preço_input + MAX_OUTPUT_TOKENS(8192) × preço_output`, converte para centavos: `maxCostCents = max(Math.ceil(maxCostUsd × exchangeRate × 100), MIN_COST_CENTS)`
4. Verifica se `balanceCents >= maxCostCents`. Se insuficiente, retorna `402 Payment Required`
5. Se o saldo cobre o custo máximo, inicia stream OpenAI com `max_tokens: 8192`
6. Ao completar o stream, calcula custo real: `costUsd = (inputTokens × preço_input + outputTokens_reais × preço_output)`, converte para centavos: `costCents = max(Math.ceil(costUsd × exchangeRate × 100), MIN_COST_CENTS)` onde `MIN_COST_CENTS = 100`
7. Deduz custo real (não o estimado) via `deductCredits(userId, costCents, { exchangeRate, inputTokens, outputTokens, modelUsed, costUsd, conversationTitle })` em transação atômica
8. Se a chamada OpenAI falhar antes de produzir output, nenhum crédito é deduzido
9. Saldo nunca fica negativo — o gate garante que o saldo cobria o pior caso (8192 tokens), e o custo real é sempre ≤ pior caso
10. Header `X-Balance-Remaining` retornado em toda resposta de chat — frontend atualiza badge sem re-fetch
11. Logs de consumo registrados em `credit_transactions` com `type: consumption` e metadados completos (`exchangeRate`, `inputTokens`, `outputTokens`, `modelUsed`, `costUsd`)

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
I want successful payments to automatically add internal balance to the student's account,
so that the purchase flow is seamless and reliable.

**Acceptance Criteria:**

1. `POST /api/webhooks/stripe` valida assinatura do webhook com `STRIPE_WEBHOOK_SECRET`
2. Evento `checkout.session.completed` calcula saldo interno a creditar: `valor_pago_centavos × (CREDIT_PERCENTAGE / 100)` (ex: pacote de R$69,90 com 40% = R$27,96 de saldo interno = 2796 centavos)
3. Busca cotação atual via `getExchangeRate("USD-BRL")` para registro e dispara `addCredits(userId, amountCents, stripePaymentId, exchangeRate)` em transação atômica
4. Idempotência garantida — `stripe_payment_id` tem constraint unique, duplo disparo não duplica créditos
5. Endpoint retorna `200` rapidamente (processamento síncrono, sem filas no MVP)
6. Falhas logadas com `stripe_payment_id` para reprocessamento manual se necessário

### Story 3.5 — Painel do Usuário

As a student,
I want a dashboard showing my credits, purchase history and conversation history,
so that I can track my usage and manage my account.

**Acceptance Criteria:**

1. Página `/dashboard` exibe: saldo atual de créditos, lista de `credit_transactions` com tipo, valor e data (paginada, 20/página), lista de conversas com título e data (link para reabrir no chat)
2. Dados carregados via Server Components do Next.js 14
3. Link "Comprar mais créditos" em destaque quando saldo < 10
4. Layout consistente com o shell definido no Epic 1

### Story 3.6 — Refatoração do Sistema de Precificação

As a product owner,
I want the credit system to deduct costs based on real token consumption and daily USD-BRL exchange rate,
so that the business margin is protected and usage is metered accurately.

**Acceptance Criteria:**

1. Gate pré-chamada estima custo máximo (input real + MAX_OUTPUT_TOKENS=8192 × taxa) e verifica se saldo cobre
2. Saldo insuficiente para custo máximo estimado bloqueia envio com prompt inline (`402`)
3. Após streaming, deduz custo real (não o estimado). Custo mínimo: `MIN_COST_CENTS = 100` (1 crédito)
4. Saldo nunca fica negativo — gate garante cobertura do pior caso antes da chamada OpenAI
5. Toda `CreditTransaction` registra `exchangeRate`, `inputTokens`, `outputTokens`, `modelUsed`, `costUsd`
6. Cotação USD-BRL buscada 1x/dia via AwesomeAPI, armazenada em `exchange_rates`, fallback em 3 níveis
7. Webhook credita `valor_pago × CREDIT_PERCENTAGE%` em centavos no `balanceCents`
8. Frontend exibe saldo em "créditos" (não reais), atualiza via `X-Balance-Remaining` e evento `done`
9. `tiktoken` conta tokens com precisão; custo real: `max(Math.ceil(costUsd × exchangeRate × 100), MIN_COST_CENTS)`
10. Nenhuma regressão em auth, chat UI, streaming SSE, Stripe Checkout
11. Testes unitários e de integração passam

**Full spec:** [docs/stories/epic-3/story-3.6-pricing-refactoring.md](stories/epic-3/story-3.6-pricing-refactoring.md)

---

## Epic 4: Admin & Operações

> Ferramentas de administração e operação do SOL: painel administrativo com visibilidade completa de uso por usuário, controle de tokens consumidos e monitoramento do produto. Ao final deste epic, o operador do SOL tem controle e visibilidade total da operação.

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
7. Página `/admin` exibe: lista de usuários com saldo, tokens consumidos e última atividade
8. Nenhuma regressão em auth, chat ou fluxo de créditos

---

## Checklist Results Report

### Category Statuses

| Category                         | Status  | Notes                                                                                                          |
| -------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| 1. Problem Definition & Context  | ✅ PASS | Problema claro (saturação leilão), audiência específica (alunos Space), métrica de sucesso mensurável (<30min) |
| 2. MVP Scope Definition          | ✅ PASS | In/out of scope explícitos, foco correto em chat + auth + créditos + pagamento                                 |
| 3. User Experience Requirements  | ✅ PASS | Flows primários documentados, telas definidas, estado de erro (inline) especificado                            |
| 4. Functional Requirements       | ✅ PASS | FR1–FR11 testáveis, cobrindo todos os flows do MVP + anexos                                                    |
| 5. Non-Functional Requirements   | ✅ PASS | Performance (3s streaming), segurança (JWT, bcrypt), infra (Docker, VPS), zeroing lock-in                      |
| 6. Epic & Story Structure        | ✅ PASS | 4 epics sequenciais, 14 stories dimensionadas para sessão de agente, ACs testáveis                             |
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
