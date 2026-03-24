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
| 2026-03-04 | 10.0    | Migração OpenAI → Anthropic Claude API (claude-sonnet-4-5-20250929 / claude-haiku-4-5-20251001). Prompt Strategy Architecture com 3 camadas (Base Fixa, Módulos Contextuais, Biblioteca de Padrões) e classificação automática de consciência (Schwartz 1-5) e sofisticação de mercado (1-5). Novo Epic 8 (Feedback Loop & Inteligência de Resultados): coleta de métricas de performance, upload de vídeo produzido com análise comparativa, classificação automática PÉSSIMO→EXCELENTE, inteligência acumulada por nicho. FR28–FR33, NFR9 adicionados. Story 6.5 expandida com prompt dinâmico. Story 6.8 adicionada (Classificação Automática de Mercado). Remoção de tiktoken. OPENAI_API_KEY → ANTHROPIC_API_KEY. | Morgan (PM) |
| 2026-03-06 | 11.0    | Extensão da Story 4.2 com gráficos temporais no admin console. AC33 substituído (sem gráficos → com gráficos Recharts). ACs 41-48 adicionados (7 gráficos de tendência + features comuns). FR34 adicionado (dashboards visuais). Recharts adicionado ao Technical Assumptions. | Morgan (PM) |
| 2026-03-11 | 12.0    | Adição do Epic 12 (Ad Intelligence & Content Discovery) com Stories 12.1-12.9. FR35-FR41 adicionados (busca de ads, orgânicos virais, análise de link, classificação de formato, integração quiz, admin integrações, concorrentes). 9 stories com ACs completos. Novas env vars: META_AD_LIBRARY_ACCESS_TOKEN, YOUTUBE_API_KEY, TIKTOK_RESEARCH_CLIENT_KEY/SECRET, INSTAGRAM_ACCESS_TOKEN. | Morgan (PM) |

---

## Requirements

### Functional

- **FR1:** O sistema deve permitir que usuários se cadastrem e façam login com email e senha via NextAuth.js v5 (Credentials Provider)
- **FR2:** O sistema deve manter sessão autenticada via JWT em cookie httpOnly
- **FR3:** O usuário autenticado deve ter acesso a um chat conversacional com IA como feature **complementar** — utilizado para iterar/refinar roteiros gerados pelo quiz ou para discussões livres sobre criação de ofertas
- **FR4:** O chat deve enviar mensagens para a Anthropic Claude API (claude-sonnet-4-5-20250929 para outputs finais, claude-haiku-4-5-20251001 para iterações intermediárias) e retornar respostas via streaming (Server-Sent Events)
- **FR5:** O sistema deve calcular o custo máximo estimado em créditos da mensagem (tokens de input estimados × CREDITS_PER_M_INPUT/1M + MAX_OUTPUT_TOKENS × CREDITS_PER_M_OUTPUT/1M, arredondado para cima, mínimo 1), verificar se o saldo de créditos cobre esse máximo, executar a chamada Claude API se coberto, e deduzir os créditos reais (baseados em `usage.input_tokens` e `usage.output_tokens` retornados pela API) após o streaming completar
- **FR6:** O usuário deve ser bloqueado de enviar novas mensagens quando seu saldo de créditos for insuficiente para cobrir o custo máximo estimado em créditos
- **FR7:** O usuário deve poder visualizar seu saldo atual de créditos e quantos créditos foram gastos na última mensagem. O aluno NÃO visualiza tokens, custo em reais ou qualquer dado de backend
- **FR8:** O sistema deve permitir a compra de pacotes de créditos via Stripe Checkout (cartão e PIX)
- **FR9:** O sistema deve processar webhooks do Stripe para confirmar pagamentos e creditar o número exato de créditos do pacote comprado no saldo do usuário. Sem conversão, sem porcentagem
- **FR10:** O usuário deve ter acesso a um painel básico com: saldo de créditos, histórico de compras e histórico de conversas
- **FR11:** O aluno pode anexar até 3 arquivos por mensagem (imagens: JPEG, PNG, GIF, WEBP; documentos: PDF, TXT, MD, DOCX; máx 10MB cada) como contexto adicional para a IA. Imagens processadas via Claude Vision (nativo — suporte multimodal integrado à API, sem necessidade de modelo separado). Documentos têm conteúdo extraído como texto (limite 50.000 caracteres — rejeitado se exceder, nunca truncado). Arquivos processados em memória sem persistência. Custo em créditos inclui tokens dos anexos no gate e na dedução real
- **FR12:** Usuários com `role: ADMIN` têm acesso ao painel em `/admin` (e rotas `/api/admin/*`) com dados reais do banco. O painel exibe: **(a) Métricas de Usuários** — total cadastrados, ativos nos últimos 7d (≥1 mensagem), sem saldo útil (`credits = 0`), novos nos últimos 30d, lista paginada 20/pág com email, saldo em créditos, total de mensagens e data de cadastro; **(b) Métricas de Uso** — mensagens totais/hoje/7d, tokens input/output separados, modelo mais usado com percentual, média de tokens/mensagem, total de mensagens com e sem anexo; **(c) Métricas Financeiras** — receita bruta via `SUM(priceInCents) dos pacotes vendidos WHERE type = 'purchase'`, custo Claude API estimado via tokens e pricing da Anthropic, lucro bruto, margem bruta e markup, créditos vendidos vs consumidos, saldo total de créditos retido na plataforma; **(d) Adição Manual de Créditos** — admin informa email + quantidade de créditos + motivo, confirmação antes de executar, registrado com `type: adjustment`, `adminEmail`, `description`, sem Stripe
- **FR19:** Administradores com `role: ADMIN` podem visualizar e editar as constantes de precificação (CREDITS_PER_M_INPUT, CREDITS_PER_M_OUTPUT) e os pacotes de créditos (nome, créditos, preço) via painel admin. Alterações entram em vigor imediatamente para novas mensagens. Transações passadas mantêm snapshot da config vigente no momento
- **FR20:** O painel admin deve exibir um simulador de precificação em tempo real mostrando: custo em créditos por perfil de mensagem (curta, média, longa, pesada), estimativa de mensagens por pacote, custo real Claude API vs receita, margem e markup por pacote
- **FR21:** O sistema deve implementar um quiz estruturado com 48 perguntas distribuídas em 6 seções: Onboarding (9 perguntas), Quiz Inicial (7+1 condicional), Caminho 1A — Anúncio Criativo (5 perguntas), Caminho 1B — Vídeo Orgânico (3 perguntas), Caminho 2A — Vídeo Modelado (13 perguntas incluindo upload), Caminho 2B — Vídeo do Zero (11 perguntas). Perguntas condicionais aparecem/escondem baseado em respostas anteriores (ex: "sem aparecer" → abre sub-pergunta 3.1 sobre formato de produção)
- **FR22:** O sistema deve suportar onboarding persistente com múltiplos perfis por usuário (um por produto/nicho). As 9 perguntas de onboarding são preenchidas uma única vez por perfil e reutilizadas em todas as produções futuras. O aluno pode selecionar perfil existente ou criar novo antes de cada quiz
- **FR23:** O sistema deve processar upload de vídeo no caminho 2A (Vídeo Modelado): aluno faz upload de vídeo referência → armazenamento temporário em disco → AssemblyAI transcreve (speakers, emoção) → FFmpeg extrai frames visuais → Claude Vision (nativo) analisa estrutura (ganchos, CTA, cortes) → gera descrição textual consolidada → arquivo de vídeo deletado. Limites: 5 minutos de duração, ~500MB. Processamento leva 30–120 segundos com UX de progresso
- **FR24:** Ao completar todas as seções do quiz, o sistema deve gerar um roteiro completo via IA usando TODO o contexto coletado (onboarding + quiz inicial + caminho 1 + caminho 2 + video analysis se 2A). A geração usa streaming SSE, cria um Roteiro (Conversation com quizSessionId) e aplica o gate de créditos existente (mesma lógica do chat: tokens de input do prompt completo + MAX_OUTPUT_TOKENS)
- **FR25:** O sistema deve exibir "Meus Roteiros" (substituindo "Minhas Conversas") com listagem de roteiros gerados. Cada roteiro mostra: título, data, caminhos usados (ex: Anúncio + Modelado). Clicar abre o roteiro com opção de chat de iteração
- **FR26:** Após geração do roteiro, o aluno pode enviar mensagens no mesmo Roteiro (Conversation) para iterar/refinar. O system prompt do chat de iteração inclui contexto completo do quiz + roteiro gerado. Créditos deduzidos por mensagem (mesma lógica do FR5)
- **FR27:** O quiz deve exibir 4 combinações de caminhos possíveis baseado nas ramificações do Quiz Inicial: (1A+2A) Anúncio + Modelado, (1A+2B) Anúncio + Do Zero, (1B+2A) Orgânico + Modelado, (1B+2B) Orgânico + Do Zero. Cada combinação determina quais seções de perguntas são apresentadas ao aluno
- **FR28:** Classificação automática de nível de consciência (Schwartz 1-5) e sofisticação de mercado (1-5) via chamada intermediária à Claude API antes da geração de roteiros. O sistema analisa as respostas do quiz (produto, público, dor, diferencial, experiência com ads) e retorna `awarenessLevel` (1-5) e `sophisticationLevel` (1-5) com justificativa. Esses valores alimentam a seleção de módulos contextuais do prompt
- **FR29:** Coleta de métricas de performance por roteiro produzido: para pago — impressões, CTR, CPC, CPM, CPA, ROAS, hook rate, retenção; para orgânico — views, likes, comments, shares, saves. Métricas coletadas por snapshot temporal (dia 1, 3, 7, 14, 30) para análise de evolução ao longo do tempo
- **FR30:** Upload de vídeo produzido com análise comparativa roteiro vs execução via Claude Vision. O sistema compara o roteiro original com o vídeo efetivamente produzido, gera nota de execução 1-5 (fidelidade ao roteiro) e sugestões de melhoria específicas
- **FR31:** Classificação automática de performance: PÉSSIMO / RUIM / MEDIANO / BOM / EXCELENTE baseada em ROAS (para pago) ou retenção (para orgânico). Thresholds configuráveis via painel admin (tabela `performance_thresholds`). Classificação recalculada automaticamente a cada novo snapshot de métricas
- **FR32:** Inteligência acumulada por nicho — o sistema correlaciona módulos de prompt utilizados × resultados de performance, identifica melhores ângulos por nicho, formatos que mais performam e padrões de sucesso. Dados agregados e anonimizados disponíveis para alimentar futuras gerações
- **FR33:** Painel admin `/admin/results` com: distribuição de classificação (PÉSSIMO→EXCELENTE), performance média por nicho e módulo de prompt, gap de execução (nota média de fidelidade roteiro vs produção), evolução temporal de resultados por período
- **FR34:** O painel admin deve exibir gráficos de tendência temporal para: cadastros de usuários, mensagens enviadas, tokens consumidos (input vs output), faturamento em R$, créditos vendidos vs consumidos, custo estimado da Claude API em USD e distribuição de uso por modelo. Gráficos atualizáveis por período (7d, 30d, 60d, 90d) com granularidade ajustável (dia, semana, mês). Implementados com Recharts em Client Components, dados agregados no PostgreSQL via `DATE_TRUNC`
- **FR35:** O sistema deve buscar anúncios ativos na Meta Ad Library API por termo de busca (nicho/produto) e país (Brasil), retornando: ad copy, link de preview do criativo, data de início, plataformas, nome do anunciante. Resultados ordenados por longevidade (dias ativo = proxy de performance). Cache de 24h por busca
- **FR36:** O sistema deve buscar conteúdos orgânicos virais por keyword/hashtag via: YouTube Data API v3 (vídeos), TikTok Research API (vídeos), Instagram Graph API (posts/reels). Resultados ordenados por engajamento (views, likes, shares). Cache de 12h
- **FR37:** O sistema deve analisar qualquer link de post social (TikTok, Instagram, YouTube, Facebook) colado pelo aluno: extrair metadados via API oficial da plataforma, baixar/acessar mídia quando disponível, classificar formato automaticamente via Claude Vision
- **FR38:** O sistema deve classificar automaticamente o formato do criativo via Claude Vision: top 5, antes/depois, isso ou aquilo, testemunho, tutorial, informativo, low-fi, provocação, pergunta, classificação/ranking, curiosidade, transformação, bastidores, unboxing, POV. Aluno pode corrigir manualmente
- **FR39:** A busca de referências deve se integrar aos caminhos do quiz: no Caminho 1A (Anúncio), busca via Meta Ad Library API; no Caminho 1B (Orgânico), busca via TikTok/YouTube/Instagram APIs. O aluno pode selecionar referência da busca OU fazer upload manual (Caminho 2A existente). A referência selecionada alimenta o prompt de geração do roteiro
- **FR40:** Enrichment layer opcional via API de terceiros (configurável pelo admin). Se disponível, enriquece resultados com badge "Histórico". Se indisponível, experiência funciona normalmente sem erro visível. Admin configura/desativa via `/admin/integrations`
- **FR41:** O sistema deve analisar perfis de concorrentes: aluno informa @ ou URL do perfil, sistema lista últimos posts via API oficial, ordena por engajamento, mostra quais conteúdos performaram melhor. Disponível como feature complementar fora do quiz

### Non Functional

- **NFR1:** A stack deve seguir arquitetura zero lock-in — Next.js 14 + Prisma + PostgreSQL + Docker, sem uso de Supabase, Firebase, Vercel (produção) ou qualquer BaaS
- **NFR2:** Todo código deve ser TypeScript strict mode — sem `any`, sem `as unknown`
- **NFR3:** O tempo de resposta da primeira palavra via streaming do chat não deve exceder 3 segundos em condições normais de rede
- **NFR4:** A lógica de consumo de créditos deve ser implementada no banco (PostgreSQL + Prisma). Cada `credit_transaction` de consumo deve registrar `input_tokens`, `output_tokens`, `model_used` (registra `claude-sonnet-4-5-20250929` ou `claude-haiku-4-5-20251001`), `credits_per_m_input` e `credits_per_m_output` (snapshot) para auditoria completa. Cotação USD-BRL NÃO é mais gerenciada pelo sistema — margem é controlada via constantes de créditos/tokens e preço dos pacotes
- **NFR5:** Toda lógica de negócio (deducção de créditos, processamento de webhooks) deve ficar em API Routes do Next.js, nunca exposta no frontend
- **NFR6:** Variáveis sensíveis (chaves Anthropic, Stripe, NextAuth secret) nunca devem aparecer no código — sempre em `.env`
- **NFR7:** O sistema deve ser deployável via Docker Compose em VPS própria
- **NFR8:** O MVP deve suportar operação com até 200 usuários ativos concorrentes sem degradação perceptível
- **NFR9:** Dados de performance (métricas, classificações, análises de execução) devem ser armazenados de forma estruturada para análise agregada por nicho, módulo de prompt e período temporal. Queries de agregação devem ser otimizadas com índices compostos para não impactar performance do painel admin

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
- **Integration:** fluxo de webhook do Stripe, fluxo de chat com mock da Claude API
- **E2E:** fora do escopo do MVP
- **Manual:** flows críticos (login → chat → compra de créditos) validados em staging antes de cada deploy

### Additional Technical Assumptions

- **Autenticação:** NextAuth.js v5, Credentials Provider (email + senha), JWT em cookie httpOnly. Sem OAuth, sem magic links no MVP.
- **Pagamentos:** Stripe Checkout + Webhooks. PIX + cartão. Lógica de créditos 100% no PostgreSQL (`credit_transactions`), nunca no Stripe. Webhook credita o número exato de créditos do pacote comprado — sem conversão, sem porcentagem.
- **IA:** Anthropic Claude API — `claude-sonnet-4-5-20250929` para outputs finais e geração de roteiros, `claude-haiku-4-5-20251001` para iterações intermediárias e classificação automática (FR28). Streaming via Server-Sent Events (não WebSockets). Contagem de tokens via resposta da API (`usage.input_tokens`, `usage.output_tokens`) — sem dependência de bibliotecas externas de tokenização. Parâmetro `max_tokens: 8192` — teto de segurança para limitar custo máximo por resposta, não limitador de qualidade (respostas típicas usam 200-2000 tokens). Contexto enviado: system prompt montado dinamicamente (ver Prompt Architecture) + resumo das últimas 10 mensagens + mensagem atual.
- **Prompt Architecture:** Sistema de prompts em 3 camadas, documentado em `docs/prompts/prompt-strategy.md`. **(1) Base Fixa** — system prompt imutável com identidade do SOL, regras de formatação, tom de comunicação e constraints de segurança. **(2) Módulos Contextuais** — blocos selecionados dinamicamente em runtime baseado na classificação automática do mercado (FR28): nível de consciência (Schwartz 1-5), sofisticação de mercado (1-5), caminho do quiz (1A/1B + 2A/2B), tipo de conteúdo (pago/orgânico). Cada combinação ativa módulos específicos (ex: módulo de "prova social agressiva" para mercado sofisticado 4-5, módulo de "educação do problema" para consciência 1-2). **(3) Biblioteca de Padrões** — repositório de ganchos, CTAs, estruturas narrativas e frameworks de copy indexados por nicho e performance histórica (alimentado pelo Epic 8). A montagem do prompt final acontece em runtime: classificação automática via `claude-haiku-4-5-20251001` → seleção de módulos → composição do prompt completo → geração via `claude-sonnet-4-5-20250929`.
- **Modelo de custo por mensagem (créditos por tokens):** Constantes configuráveis via admin (tabela `pricing_config`): `CREDITS_PER_M_INPUT = 500` (créditos por 1M tokens de input), `CREDITS_PER_M_OUTPUT = 2000` (créditos por 1M tokens de output), `MAX_OUTPUT_TOKENS = 8192` (teto de segurança). Gate pré-chamada: `maxCredits = max(1, ceil(inputTokens/1M × CREDITS_PER_M_INPUT + MAX_OUTPUT_TOKENS/1M × CREDITS_PER_M_OUTPUT))`. Se `user.credits < maxCredits` → 402. Após streaming, calcula créditos reais usando `usage.input_tokens` e `usage.output_tokens` retornados pela Claude API: `creditsUsed = max(1, ceil(inputTokens/1M × CREDITS_PER_M_INPUT + outputTokens/1M × CREDITS_PER_M_OUTPUT))`. Mínimo: 1 crédito por mensagem. Cada transação registra `inputTokens`, `outputTokens`, `modelUsed`, `creditsPerMInput` e `creditsPerMOutput` (snapshot) para auditoria.
- **Pacotes de créditos:** Armazenados na tabela `credit_packages` (configuráveis via admin): Starter (R$29,90 → 100 créditos), Pro (R$99,90 → 500 créditos), Max (R$199,90 → 1200 créditos). Aluno paga R$ → recebe créditos inteiros do pacote. Sem conversão, sem câmbio.
- **Proteções:** Saldo negativo é matematicamente impossível. O gate pré-chamada garante que o saldo de créditos cobre o pior caso (input estimado + 8192 tokens de output). Como o custo real é sempre ≤ custo estimado e o saldo cobria o estimado, o saldo após dedução é sempre ≥ 0.
- **Infraestrutura:** VPS própria, Docker Compose, GitHub Actions para CI/CD. Proibido: Vercel produção, Railway, Render. FFmpeg instalado no Docker container (`apt-get install ffmpeg`) para processamento de vídeo.
- **Idioma do código:** TypeScript strict mode. Sem `any`. Sem `as unknown`.
- **Variáveis sensíveis:** sempre em `.env`, nunca hardcodadas. Inclui: `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXTAUTH_SECRET`, `DATABASE_URL`, `ASSEMBLYAI_API_KEY`. Nota: `CREDITS_PER_M_INPUT` e `CREDITS_PER_M_OUTPUT` NÃO são variáveis de ambiente — são armazenados no banco (tabela `pricing_config`) e editáveis via admin.
- **Novas variáveis de ambiente (Epic 7):** `ASSEMBLYAI_API_KEY` (chave da API AssemblyAI), `VIDEO_MAX_DURATION_SECONDS=300` (5 minutos), `VIDEO_MAX_SIZE_MB=500`, `VIDEO_TEMP_DIR=/tmp/sol-uploads` (diretório temporário no container).
- **Anexos no chat:** Suporte a upload de arquivos como contexto para a IA. Imagens (JPEG, PNG, GIF, WEBP) processadas via Claude Vision (nativo — suporte multimodal integrado, sem modelo separado). Documentos (PDF, TXT, MD, DOCX) têm conteúdo extraído como texto plano em memória — nunca persistidos em disco ou storage externo. Limites: 10MB/arquivo, 3 arquivos/mensagem, 50.000 caracteres/documento (rejeitado com mensagem clara se exceder, nunca truncado). PDFs escaneados (sem texto extraível) detectados e avisados ao aluno. Tokens de anexos somados ao input para cálculo de gate e custo real em créditos. `CreditTransaction` registra `hasAttachments` (Boolean), `attachmentTypes` (String[]) e `attachmentTokens` (Int) para auditoria. Request com anexo enviado via `multipart/form-data`; sem anexo, mantém `application/json` sem alteração.
- **Processamento de vídeo (Epic 7):** AssemblyAI SDK (`assemblyai` npm package) para transcrição de vídeo com speakers e emoção. FFmpeg (binário no Docker container) para extração de frames visuais. Armazenamento temporário em disco (`/tmp/sol-uploads/`) — arquivo deletado após processamento via `try/finally`. Timeout total: 3 minutos. Progresso reportado ao frontend via polling. Claude Vision (nativo em `claude-sonnet-4-5-20250929`) para análise de frames e consolidação estrutural (ganchos, CTA, cortes, tom).
- **Visualização de dados (Story 4.2):** Recharts (MIT, sem lock-in) como biblioteca de gráficos React declarativa para dashboards admin. Server Components executam queries agregadas via `DATE_TRUNC` no PostgreSQL com timezone `America/Sao_Paulo`. Dados serializados como props para Client Components que renderizam com Recharts. Agregação SEMPRE no banco — nunca no frontend. Índices compostos em `users(created_at)`, `messages(created_at, role)`, `credit_transactions(type, created_at)`, `credit_transactions(model_used)` para performance de queries temporais.
- **Novas variáveis de ambiente (Epic 12):** `META_AD_LIBRARY_ACCESS_TOKEN` (token da Meta Ad Library API), `YOUTUBE_API_KEY` (chave da YouTube Data API v3), `TIKTOK_RESEARCH_CLIENT_KEY` e `TIKTOK_RESEARCH_CLIENT_SECRET` (credenciais TikTok Research API), `INSTAGRAM_ACCESS_TOKEN` (token da Instagram Graph API), `ENRICHMENT_API_KEY` (opcional — chave de API de terceiro para enrichment), `ENRICHMENT_API_URL` (opcional — URL da API de enrichment).
- **Integrações externas (Epic 12):** API Gateway pattern para todas as chamadas a APIs externas. Gateway gerencia: rate limiting em memória, cache via tabela `search_cache` no PostgreSQL (não Redis — zero lock-in), retry com backoff, fallback chain (API → cache fresh → cache stale → null). TTL de cache: 24h para ads, 12h para orgânico. Chaves de API NUNCA no banco — apenas nome da env var salvo em `api_configurations.api_key_env`. Valores reais em `.env`. Frontend nunca recebe chaves ou tokens de API.

---

## Epic List

| Epic | Title                 | Goal                                                                                                                                                                          |
| ---- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Foundation & Auth     | Estabelecer infraestrutura (Turborepo, Docker, PostgreSQL, CI/CD) e autenticação completa (NextAuth.js v5). Entrega: produto deployado com login funcional.                   |
| 2    | Chat (Complementar)   | Implementar chat com streaming Claude API, persistência de histórico e estado inline de créditos insuficientes. Chat é feature complementar para iteração sobre roteiros e discussões livres. |
| 3    | Créditos & Pagamentos | Implementar sistema de créditos por tokens, pacotes de créditos, Stripe Checkout + PIX/cartão, webhooks e painel do usuário. Entrega: SOL monetizado, ciclo de valor fechado. |
| 4    | Admin & Operações     | Painel administrativo com métricas reais de usuários, uso e financeiras, mais ação de adição manual de créditos com auditoria completa. Entrega: operador tem visibilidade financeira e operacional total do SOL. |
| 5.5  | Pricing Admin         | Painel administrativo de precificação com simulador em tempo real e edição de constantes e pacotes. Entrega: operador controla precificação sem deploy. |
| 6    | Quiz & Onboarding     | Experiência central do SOL: quiz estruturado com 48 perguntas, 6 seções, 4 caminhos condicionais, onboarding persistente com múltiplos perfis e geração de roteiro via IA. Entrega: aluno responde quiz e recebe roteiro personalizado. |
| 7    | Video Processing      | Pipeline de processamento de vídeo para o caminho 2A (Vídeo Modelado): upload → AssemblyAI (transcrição) → FFmpeg (frames) → IA (análise estrutural) → descrição textual. Entrega: aluno faz upload de vídeo de referência e a IA usa a análise para gerar roteiro modelado. |
| 8    | Feedback Loop & Inteligência de Resultados | Ciclo completo de feedback: coleta de métricas de performance por roteiro (pago/orgânico), upload de vídeo produzido com análise comparativa, classificação automática de resultados, inteligência acumulada por nicho. Entrega: SOL aprende com os resultados dos alunos e melhora as gerações futuras. |
| 12   | Ad Intelligence & Content Discovery | Plataforma de descoberta e análise de referências criativas integrada ao quiz. Busca de ads (Meta Ad Library API) e conteúdos orgânicos virais (TikTok, YouTube, Instagram) com classificação automática de formato via Claude Vision e geração de roteiro modelado. 3 fases: Meta Ads + Link Analysis, Busca de Virais, Enrichment + Concorrentes. |

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

> Implementar o chat como feature complementar do SOL: interface de chat com streaming de respostas da Claude API (claude-sonnet-4-5-20250929 / claude-haiku-4-5-20251001), persistência do histórico de roteiros/conversas no banco, e estado inline de créditos insuficientes. O chat é utilizado para (a) iterar/refinar roteiros gerados pelo quiz, (b) discussões livres sobre criação de ofertas. A tela principal do produto agora é o quiz (Epic 6), não o chat.

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

### Story 2.3 — Claude API Integration com Streaming

As a student,
I want to receive AI-generated offers and creative scripts as they are written,
so that the response feels immediate and alive.

**Acceptance Criteria:**

1. `POST /api/chat` aceita `{ conversationId, message }`, valida autenticação
2. Rota seleciona modelo: `claude-haiku-4-5-20251001` para iterações, `claude-sonnet-4-5-20250929` para outputs finais (lógica documentada em comentário)
3. Resposta enviada via Server-Sent Events (SSE) — tokens chegam ao cliente em tempo real
4. System prompt inclui contexto de produto (SOL é especialista em criação de ofertas de infoprodutos)
5. Mensagem do usuário e resposta completa da IA persistidas no banco ao final do stream
6. Erros da Claude API (rate limit, timeout) retornam mensagem amigável no chat

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
2. Tipos suportados — Imagens: JPEG, PNG, GIF, WEBP (processadas via Claude Vision nativo); Documentos de texto: PDF, TXT, MD (conteúdo extraído como texto plano); Documentos ricos: DOCX (conteúdo extraído como texto plano)
3. Tamanho máximo por arquivo: 10MB. Arquivos maiores são rejeitados com mensagem clara antes do upload
4. Conteúdo extraído de documentos limitado a 50.000 caracteres por arquivo. Se exceder, arquivo é REJEITADO com mensagem clara (nunca truncado silenciosamente)
5. PDFs escaneados (sem texto extraível) detectados e avisados ao aluno com sugestão de enviar como imagem ou digitar o conteúdo
6. Quando imagem é anexada, sistema usa Claude Vision (nativo — suporte multimodal integrado ao modelo, sem troca de modelo). Gate de custo máximo calcula com tokens do modelo efetivamente usado
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

1. Migration Prisma cria tabela `credit_transactions` com: `id`, `user_id` (FK), `amount` (int, em créditos — positivo = compra/adjustment, negativo = consumo), `type` (enum: `purchase` | `consumption` | `adjustment`), `description`, `stripe_payment_id` (nullable, unique), `input_tokens` (int, nullable — tokens de input consumidos), `output_tokens` (int, nullable — tokens de output consumidos), `model_used` (string, nullable — modelo Claude utilizado), `credits_per_m_input` (int, nullable — snapshot da config no momento do consumo), `credits_per_m_output` (int, nullable — snapshot da config no momento do consumo), `admin_email` (string, nullable — email do admin para adjustments), `has_attachments` (boolean, nullable), `attachment_types` (string[], nullable), `attachment_tokens` (int, nullable), `modules_used` (string[], nullable — módulos de prompt contextuais utilizados na geração), `created_at`
2. Migration Prisma cria tabela `pricing_config` com: `id`, `key` (string, unique), `value` (int), `updated_at`, `updated_by` (string — email do admin). Seeds iniciais: `CREDITS_PER_M_INPUT=500`, `CREDITS_PER_M_OUTPUT=2000`, `MAX_OUTPUT_TOKENS=8192`
3. Migration Prisma cria tabela `credit_packages` com: `id`, `name` (string), `credits` (int), `price_in_cents` (int — preço em centavos de real para o Stripe), `active` (boolean, default true), `created_at`, `updated_at`. Seeds iniciais: Starter(100, 2990), Pro(500, 9990), Max(1200, 19990)
4. Coluna `credits` na tabela `users` (int, default 0) representa saldo atual de créditos — atualizada via transação atômica junto com insert em `credit_transactions`
5. Funções utilitárias em `packages/db`: `deductCredits(userId, creditsUsed, metadata: { inputTokens, outputTokens, modelUsed, creditsPerMInput, creditsPerMOutput, conversationTitle })` e `addCredits(userId, credits, stripePaymentId?)` com rollback em caso de saldo insuficiente
6. Saldo nunca fica negativo — o gate pré-chamada garante cobertura do pior caso antes de executar a chamada Claude API
7. Função utilitária `getPricingConfig()` retorna as constantes de precificação da tabela `pricing_config`

### Story 3.2 — Deducção de Créditos Baseada em Tokens no Chat

As a product owner,
I want credits to be deducted based on real token consumption,
so that usage is metered accurately and sustainably.

**Acceptance Criteria:**

1. `POST /api/chat` estima tokens de input (system prompt + resumo das últimas 10 mensagens + mensagem nova) para cálculo do gate **antes** de chamar a Claude API. Após streaming, usa `usage.input_tokens` e `usage.output_tokens` retornados pela API para dedução real
2. Backend busca constantes de precificação via `getPricingConfig()` (tabela `pricing_config`)
3. Calcula custo máximo estimado em créditos (gate): `maxCredits = max(1, ceil(inputTokens/1_000_000 × CREDITS_PER_M_INPUT + MAX_OUTPUT_TOKENS/1_000_000 × CREDITS_PER_M_OUTPUT))`
4. Verifica se `user.credits >= maxCredits`. Se insuficiente, retorna `402 Payment Required`
5. Se o saldo cobre o custo máximo, inicia stream Claude API com `max_tokens: 8192`
6. Ao completar o stream, calcula créditos reais: `creditsUsed = max(1, ceil(inputTokens/1_000_000 × CREDITS_PER_M_INPUT + outputTokens/1_000_000 × CREDITS_PER_M_OUTPUT))`
7. Deduz créditos reais (não o estimado) via `deductCredits(userId, creditsUsed, { inputTokens, outputTokens, modelUsed, creditsPerMInput, creditsPerMOutput, conversationTitle })` em transação atômica
8. Se a chamada Claude API falhar antes de produzir output, nenhum crédito é deduzido
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
13. Modelo mais usado (claude-sonnet-4-5-20250929 vs claude-haiku-4-5-20251001) com percentual sobre total de mensagens com consumo
14. Média de tokens por mensagem (input + output / total de mensagens com tipo consumption)
15. Total de mensagens com anexo (`hasAttachments = true`) vs sem anexo

**Métricas Financeiras**
16. Receita bruta total: calculada via JOINing `credit_transactions` (type=purchase) com `credit_packages` para obter `priceInCents`, em R$
17. Receita dos últimos 30 dias: idem com filtro de data
18. Custo Claude API estimado via tokens consumidos e pricing da Anthropic
19. Lucro bruto = Receita bruta − Custo Claude API estimado
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
33. Gráficos de linha temporal implementados com Recharts para métricas que se beneficiam de visualização de tendência (cadastros, mensagens, tokens, faturamento, créditos, custo API, distribuição por modelo)
34. Sem exportação CSV/PDF
35. Sem CRUD de usuários (editar, deletar, bloquear)
36. Sem filtros de período customizado — apenas períodos fixos: hoje, 7d, 30d, histórico total
37. Dados carregados via Server Components Next.js — atualiza no refresh, sem real-time

**Qualidade e Consistência**
38. Visual dark/solar consistente com o restante do SOL (Tailwind + Shadcn/UI)
39. Todas as rotas `/api/admin/*` verificam `role: ADMIN` server-side (não apenas middleware)
40. Nenhuma regressão em: auth, chat, streaming SSE, webhook Stripe, painel do usuário (`/dashboard`)

**Visualização Temporal (Gráficos)**
41. Gráfico de linha — novos usuários cadastrados por dia/semana/mês (últimos 7/30/60/90 dias). Dados: `COUNT(users) GROUP BY DATE_TRUNC(granularity, created_at)`. Seletor de granularidade (dia/semana/mês)
42. Gráfico de linha — mensagens enviadas por dia/semana (últimos 7/30/60/90 dias). Dados: `COUNT(messages) WHERE role='user' GROUP BY DATE_TRUNC(...)`. Separação visual: total vs com anexo
43. Gráfico de área empilhada — tokens consumidos por período (input vs output). Dados: `SUM(input_tokens), SUM(output_tokens) FROM credit_transactions WHERE type='consumption' GROUP BY DATE_TRUNC(...)`
44. Gráfico de barras — faturamento por semana/mês em R$. Dados: JOIN `credit_transactions` (type=purchase) com `credit_packages` para `price_brl`, GROUP BY período
45. Gráfico de linha dupla — créditos vendidos vs consumidos por período. Dados: `SUM(amount) FROM credit_transactions GROUP BY type, DATE_TRUNC(...)`
46. Gráfico de linha — custo estimado Claude API por período em USD. Dados: tokens × pricing Anthropic (claude-sonnet-4-5-20250929: $3/MTok input, $15/MTok output; claude-haiku-4-5-20251001: $0.80/MTok input, $4/MTok output), agrupado por `model_used`
47. Gráfico de barras — distribuição de uso por modelo (Sonnet vs Haiku) por período. Dados: `COUNT(*) FROM credit_transactions WHERE type='consumption' GROUP BY model_used, DATE_TRUNC(...)`
48. Todos os gráficos possuem: tooltip com valores exatos, seletor de período (7d, 30d, 60d, 90d), loading state, empty state ("Sem dados para o período selecionado")

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
4. Exibe custo real Claude API (USD) vs receita (R$) por perfil, baseado no pricing da Anthropic
5. Exibe margem e markup por pacote
6. Simulador usa valores editados (não salvos) para preview — admin pode simular antes de aplicar
7. Visual consistente com dark/solar theme do SOL

---

## Epic 6: Quiz & Onboarding

> Experiência central do SOL: quiz estruturado que coleta contexto rico do aluno (produto, público, estilo, referências) e gera roteiro personalizado via IA. Inclui onboarding persistente com múltiplos perfis, quiz com caminhos condicionais (4 combinações), lógica condicional de perguntas, classificação automática de mercado (FR28) e geração de roteiro via Claude API com prompt dinâmico (3 camadas) e streaming SSE. Ao final deste epic, o aluno responde o quiz e recebe um roteiro completo, podendo iterar via chat (Epic 2).

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
2. **Classificação automática (pré-geração):** antes de montar o prompt, sistema envia respostas do quiz para `claude-haiku-4-5-20251001` que retorna `awarenessLevel` (1-5, Schwartz) e `sophisticationLevel` (1-5) com justificativa. Valores persistidos no `QuizSession`
3. **Seleção dinâmica de módulos:** baseado na classificação (awareness + sophistication) e combinação de caminhos (AD/ORGANIC + MODELED/SCRATCH), sistema seleciona módulos contextuais da camada 2 do Prompt Architecture. Ex: awareness 1-2 → módulo "educação do problema"; sophistication 4-5 → módulo "diferenciação agressiva"
4. **Montagem do prompt dinâmico:** prompt final = Base Fixa (camada 1) + Módulos Contextuais selecionados (camada 2) + Padrões relevantes do nicho (camada 3, se disponíveis via Epic 8) + contexto completo do quiz
5. Chamada Claude API (`claude-sonnet-4-5-20250929`) com streaming SSE (mesma infra do chat — Epic 2)
6. Gate de créditos funciona igual: `calculateMaxCredits(totalInputTokens, config)` → verificar saldo → deduzir real após completar. Custo da chamada de classificação (Haiku) incluído no gate total
7. Cria `Conversation` (Roteiro) com `quizSessionId` preenchido
8. Primeira mensagem `assistant` na Conversation = roteiro completo gerado
9. Aluno é redirecionado para `/roteiros/[id]` para visualizar e iterar
10. `CreditTransaction` registrada com metadados completos (tokens, modelo, snapshot config) e campo adicional `modules_used` (string[] — lista de módulos contextuais utilizados na geração)

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

### Story 6.8 — Classificação Automática de Mercado

As a developer,
I want the system to automatically classify awareness and sophistication levels before script generation,
so that the prompt is dynamically optimized for each student's market context.

**Acceptance Criteria:**

1. Função `classifyMarket(quizAnswers, onboardingProfile)` envia dados relevantes (produto, público, dor, diferencial, experiência com ads, nicho, objetivo) para `claude-haiku-4-5-20251001` com prompt estruturado de classificação
2. Retorno da API parseado em formato tipado: `{ awarenessLevel: 1-5, sophisticationLevel: 1-5, awarenessJustification: string, sophisticationJustification: string }`
3. **Awareness Level (Schwartz 1-5):** 1 = Inconsciente (não sabe que tem o problema), 2 = Consciente do problema, 3 = Consciente da solução, 4 = Consciente do produto, 5 = Mais consciente (já conhece e confia). Mapeamento prioriza resposta de O6, mas IA pode ajustar baseado no contexto completo
4. **Sophistication Level (1-5):** 1 = Mercado virgem (sem concorrentes), 2 = Poucos concorrentes, 3 = Mercado competitivo, 4 = Mercado saturado, 5 = Mercado cético. IA infere baseado em nicho, faixa de preço, experiência do aluno com ads e contexto descrito
5. Campos `awareness_level` e `sophistication_level` persistidos na tabela `quiz_sessions` (novos campos int, nullable)
6. Classificação executada automaticamente em `POST /api/quiz/generate` antes da montagem do prompt — se falhar, usa defaults (awareness=3, sophistication=3) e loga warning
7. Custo de créditos da chamada de classificação (tokens Haiku) incluído no gate total da geração do roteiro
8. Resultado da classificação exibido ao aluno na tela do roteiro gerado: "Nível de consciência: X/5 — [justificativa]", "Sofisticação de mercado: Y/5 — [justificativa]"
9. Tempo máximo da chamada de classificação: 10 segundos. Se timeout, usa defaults
10. Classificação é determinística para os mesmos inputs (temperature=0 na chamada Haiku)

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

1. Pega `transcription` + frames extraídos → envia para Claude Vision (`claude-sonnet-4-5-20250929` com suporte multimodal nativo) para análise de frames: o que aparece visualmente
2. Claude consolida tudo: ganchos usados, CTAs, estrutura do vídeo, tom de comunicação, técnicas de retenção → gera `full_description` textual
3. Salva `frame_descriptions`, `structure_analysis` e `full_description` no `VideoAnalysis`
4. Deleta arquivo temporário de vídeo e frames via `try/finally`
5. Marca `processing_status = COMPLETED`, registra `processing_time_ms`
6. `full_description` é o que alimenta o prompt de geração do roteiro (Story 6.5)
7. Créditos do processamento de vídeo (tokens de input/output da análise por IA) incluídos no custo total da geração do roteiro

---

## Epic 8: Feedback Loop & Inteligência de Resultados

> Ciclo completo de feedback que fecha o loop entre geração e performance real. O aluno registra que produziu o roteiro, publica, coleta métricas ao longo do tempo (snapshots dia 1, 3, 7, 14, 30), e opcionalmente faz upload do vídeo produzido para análise comparativa. O sistema classifica automaticamente os resultados (PÉSSIMO→EXCELENTE), correlaciona módulos de prompt × performance e acumula inteligência por nicho. Ao final deste epic, o SOL aprende com os resultados reais dos alunos e usa essa inteligência para melhorar as gerações futuras.

### Story 8.1 — Database Schema: Performance & Feedback

As a developer,
I want the database schema for performance tracking, metrics and execution analysis,
so that all feedback data can be stored and used for intelligence.

**Acceptance Criteria:**

1. Migration Prisma cria tabela `script_performances` com: `id`, `conversation_id` (FK → conversations, unique), `user_id` (FK → users), `content_type` (enum: `PAID` | `ORGANIC`), `status` (enum: `PRODUCED` | `PUBLISHED` | `METRICS` | `ANALYZED`), `niche` (string — extraído do onboarding), `modules_used` (string[] — módulos de prompt utilizados na geração), `awareness_level` (int, 1-5 — nível de consciência classificado), `sophistication_level` (int, 1-5 — sofisticação de mercado classificada), `classification` (enum: `TERRIBLE` | `BAD` | `AVERAGE` | `GOOD` | `EXCELLENT`, nullable), `execution_score` (int, nullable, 1-5 — nota de fidelidade roteiro vs produção), `execution_analysis` (text, nullable — análise comparativa detalhada), `created_at`, `updated_at`
2. Migration cria tabela `performance_metrics` com: `id`, `script_performance_id` (FK), `snapshot_day` (int — 1, 3, 7, 14 ou 30), `impressions` (int, nullable), `ctr` (float, nullable), `cpc` (float, nullable), `cpm` (float, nullable), `cpa` (float, nullable), `roas` (float, nullable), `hook_rate` (float, nullable), `retention` (float, nullable), `views` (int, nullable), `likes` (int, nullable), `comments` (int, nullable), `shares` (int, nullable), `saves` (int, nullable), `created_at`. Constraint unique: `(script_performance_id, snapshot_day)`
3. Migration cria tabela `execution_analyses` com: `id`, `script_performance_id` (FK, unique), `video_url` (string, nullable — referência ao upload), `original_script` (text — roteiro original gerado), `comparison_result` (text — análise comparativa gerada por IA), `score` (int, 1-5), `improvement_suggestions` (text[] — lista de sugestões), `created_at`
4. Migration cria tabela `performance_thresholds` com: `id`, `content_type` (enum: `PAID` | `ORGANIC`), `metric_key` (string — ex: `roas`, `retention`), `terrible_max` (float), `bad_max` (float), `average_max` (float), `good_max` (float), `updated_at`, `updated_by` (string). Seeds iniciais: PAID/roas (0.5, 1.0, 2.0, 4.0), ORGANIC/retention (0.10, 0.20, 0.35, 0.50)
5. Relações: `conversation.scriptPerformance`, `scriptPerformance.metrics`, `scriptPerformance.executionAnalysis`, `user.scriptPerformances`
6. Índices compostos para queries de agregação: `(niche, classification)`, `(modules_used)`, `(content_type, created_at)`, `(awareness_level, sophistication_level)`

### Story 8.2 — Registro de Performance: PRODUCED → PUBLISHED → METRICS

As a student,
I want to register that I produced and published my script,
so that I can start tracking its performance.

**Acceptance Criteria:**

1. Na página `/roteiros/[id]`, botão "Registrar Produção" cria `ScriptPerformance` com `status: PRODUCED` e `content_type` selecionado (PAID ou ORGANIC)
2. Após registrar produção, botão "Marcar como Publicado" atualiza `status: PUBLISHED` e habilita coleta de métricas
3. `POST /api/scripts/[id]/performance` cria registro com `niche` extraído automaticamente do onboarding profile, `modules_used` extraído da geração do roteiro, `awareness_level` e `sophistication_level` da classificação automática (FR28)
4. Validação: só pode registrar performance para Conversations com `quizSessionId` preenchido (roteiros gerados via quiz)
5. Um roteiro tem no máximo um `ScriptPerformance` (constraint unique em `conversation_id`)
6. Interface exibe status atual com indicação visual do progresso (PRODUCED → PUBLISHED → METRICS → ANALYZED)
7. Transição de status é unidirecional — não permite voltar ao status anterior

### Story 8.3 — Coleta de Métricas e Classificação Automática

As a student,
I want to input my content's performance metrics at different time intervals,
so that the system can classify my results and learn from them.

**Acceptance Criteria:**

1. Na página `/roteiros/[id]/performance`, formulário de métricas adaptativo por `content_type`: para PAID — impressões, CTR, CPC, CPM, CPA, ROAS, hook rate, retenção; para ORGANIC — views, likes, comments, shares, saves
2. Snapshots temporais: aluno pode registrar métricas nos dias 1, 3, 7, 14 e 30 após publicação. Sistema sugere o próximo snapshot baseado na data de publicação
3. `POST /api/scripts/[id]/metrics` valida e salva `PerformanceMetrics` com `snapshot_day` informado. Constraint unique impede duplicação de snapshot
4. Após cada novo snapshot, sistema recalcula classificação automática: busca thresholds da tabela `performance_thresholds` para o `content_type`, aplica métrica principal (ROAS para PAID, retenção para ORGANIC) do snapshot mais recente
5. Classificação: PÉSSIMO (≤ terrible_max), RUIM (≤ bad_max), MEDIANO (≤ average_max), BOM (≤ good_max), EXCELENTE (> good_max). Resultado salvo em `ScriptPerformance.classification`
6. Status atualizado para `METRICS` após primeiro snapshot registrado
7. Interface exibe evolução das métricas por snapshot em formato tabular (sem gráficos no MVP)
8. Validação: valores numéricos positivos, CTR/hook rate/retenção entre 0-100%, ROAS ≥ 0

### Story 8.4 — Upload de Vídeo Produzido e Análise Comparativa

As a student,
I want to upload my produced video so the AI can compare it with the original script,
so that I get an execution score and improvement suggestions.

**Acceptance Criteria:**

1. Na página `/roteiros/[id]/performance`, seção "Análise de Execução" com upload de vídeo produzido
2. Validação: mesmo limites do Epic 7 (mp4, mov, avi, webm; ≤ 500MB; ≤ 5 min)
3. `POST /api/scripts/[id]/execution-analysis` recebe vídeo, processa via pipeline existente (AssemblyAI + FFmpeg + Claude Vision) e compara com roteiro original
4. Claude Vision (`claude-sonnet-4-5-20250929`) analisa: (a) fidelidade ao roteiro — o que foi seguido vs alterado, (b) qualidade de execução — ganchos, cortes, CTA, tom, (c) sugestões de melhoria específicas e acionáveis
5. Resultado salvo em `ExecutionAnalysis`: `score` (1-5), `comparison_result` (análise detalhada), `improvement_suggestions` (lista de sugestões)
6. Score de execução também salvo em `ScriptPerformance.execution_score` e `execution_analysis` (resumo)
7. Status atualizado para `ANALYZED` após conclusão da análise
8. Custo de créditos do processamento e análise deduzido normalmente (mesma lógica do FR5)
9. Vídeo deletado após processamento (mesmo padrão do Epic 7 — sem persistência)
10. Interface exibe resultado: nota visual (1-5 estrelas), análise comparativa formatada, lista de sugestões

### Story 8.5 — Painel Admin: Results (/admin/results)

As a SOL administrator,
I want a results dashboard at /admin/results,
so that I can monitor the overall performance of scripts generated by the platform.

**Acceptance Criteria:**

1. Página `/admin/results` (protegida por `role: ADMIN`) com visão consolidada de resultados
2. **Distribuição de Classificação:** contagem e percentual de roteiros por classificação (PÉSSIMO, RUIM, MEDIANO, BOM, EXCELENTE) — total e filtrado por período (7d, 30d, 90d, total)
3. **Performance por Nicho:** tabela com nichos únicos, quantidade de roteiros, classificação média, ROAS médio (pago) e retenção média (orgânico)
4. **Performance por Módulo:** tabela com módulos de prompt utilizados, quantidade de roteiros, classificação média — identifica quais módulos geram melhores resultados
5. **Gap de Execução:** nota média de execução (fidelidade roteiro vs produção), distribuição de notas 1-5, correlação entre nota de execução e classificação de performance
6. **Evolução Temporal:** tabela com métricas agregadas por mês (últimos 6 meses): total de roteiros produzidos, classificação média, ROAS médio, retenção média
7. Dados carregados via Server Components — atualiza no refresh, sem real-time
8. Sem gráficos no MVP — números e tabelas são suficientes
9. Todas as rotas `/api/admin/results/*` verificam `role: ADMIN` server-side

### Story 8.6 — Inteligência Acumulada (/admin/intelligence)

As a SOL administrator,
I want an intelligence dashboard at /admin/intelligence,
so that I can see patterns and insights that improve future script generation.

**Acceptance Criteria:**

1. Página `/admin/intelligence` (protegida por `role: ADMIN`) com insights acumulados
2. **Correlação Módulos × Resultados:** tabela cruzando módulos de prompt com classificação média de performance. Destaque visual para módulos com classificação ≥ BOM (verde) e ≤ RUIM (vermelho)
3. **Melhores Ângulos por Nicho:** para cada nicho com ≥ 5 roteiros classificados, exibe: awareness level mais eficaz, sophistication level mais eficaz, módulos mais usados em roteiros BOM/EXCELENTE, tipo de conteúdo (pago vs orgânico) com melhor performance
4. **Formatos que Performam:** ranking de formatos de vídeo (do quiz: Q2A.4 / Q2B.6) por classificação média de performance
5. **Padrões de Sucesso:** lista dos top 10 roteiros com melhor classificação, exibindo: nicho, módulos usados, awareness/sophistication levels, métricas principais
6. **Dados Agregados para Prompt:** botão "Exportar Insights para Prompt" gera texto estruturado com os padrões identificados, formatado para ser incorporado à Biblioteca de Padrões (camada 3 do Prompt Architecture)
7. Dados anonimizados — nenhuma informação pessoal do aluno é exibida, apenas agregações por nicho/módulo
8. Mínimo de 5 roteiros classificados por nicho para exibir insights (evita conclusões com amostra insuficiente)
9. Todas as rotas `/api/admin/intelligence/*` verificam `role: ADMIN` server-side

---

## Epic 12: Ad Intelligence & Content Discovery

> Plataforma de descoberta e análise de referências criativas integrada ao quiz. O aluno informa o nicho no quiz, o SOL busca referências de ads e conteúdos orgânicos virais via APIs oficiais, a IA classifica formato e estrutura, e gera roteiro modelado. Diferencial: ciclo completo (descobrir → analisar → gerar) em um único produto. Três fases: (1) Meta Ad Library + análise de link, (2) busca de virais orgânicos, (3) enrichment + concorrentes. APIs oficiais como alicerce, terceiros como enrichment opcional com fallback silencioso, upload manual sempre disponível como camada 3.

### Story 12.1 — Database Schema: References & Integrations

As a developer,
I want the database schema for creative references, API configurations and search cache,
so that reference data can be stored and used for script generation.

**Acceptance Criteria:**

1. Migration Prisma cria tabela `creative_references` com: `id`, `user_id` (FK), `quiz_session_id` (FK, nullable), `source` (enum: `META_AD_LIBRARY` | `TIKTOK` | `YOUTUBE` | `INSTAGRAM` | `MANUAL_UPLOAD` | `ENRICHMENT`), `source_url` (string, nullable), `source_id` (string, nullable — ID externo da plataforma), `media_type` (enum: `VIDEO` | `IMAGE`), `media_url` (string, nullable — URL do preview/mídia), `ad_copy` (text, nullable), `start_date` (datetime, nullable — data início do ad), `days_active` (int, nullable — calculado), `engagement_metrics` (JSON, nullable — views, likes, shares, comments), `platform` (string — facebook, instagram, tiktok, youtube), `format_classification` (string, nullable — classificado pela IA), `format_corrected` (string, nullable — corrigido pelo aluno), `structure_analysis` (text, nullable — análise IA de gancho, CTA, cortes), `advertiser_name` (string, nullable), `search_query` (string — termo usado na busca), `created_at`
2. Migration cria tabela `search_cache` com: `id`, `query_hash` (string, unique — hash de query+source+country), `source` (enum), `results` (JSON — resultados serializados), `expires_at` (datetime), `created_at`. TTL: 24h para ads, 12h para orgânico
3. Migration cria tabela `api_configurations` com: `id`, `provider` (string, unique — meta, tiktok, youtube, instagram, enrichment), `enabled` (boolean, default true), `api_key_env` (string — nome da env var, nunca a chave em si), `rate_limit_per_hour` (int), `config` (JSON, nullable — configurações extras), `updated_at`, `updated_by` (string). Seeds iniciais para as 4 APIs oficiais
4. Migration cria tabela `competitor_profiles` com: `id`, `user_id` (FK), `platform` (string), `profile_handle` (string), `profile_url` (string), `last_fetched_at` (datetime, nullable), `top_posts` (JSON, nullable), `created_at`
5. Relações: `user.creativeReferences`, `quizSession.creativeReferences`, `user.competitorProfiles`
6. Índices: `(source, search_query)`, `(user_id, created_at)`, `(quiz_session_id)` na creative_references; `(query_hash)`, `(expires_at)` na search_cache; `(user_id, platform)` na competitor_profiles

### Story 12.2 — Meta Ad Library API Integration

As a student doing the Ad Creative path (1A),
I want to search active ads in my niche directly from the quiz,
so that I can find proven ad references without leaving SOL.

**Acceptance Criteria:**

1. Service `AdLibraryService` em `apps/web/lib/services/ad-library.ts` encapsula toda comunicação com Meta Ad Library API. Configuração via `META_AD_LIBRARY_ACCESS_TOKEN` (env var)
2. `GET /api/references/ads?q={query}&country=BR&limit=20` busca anúncios ativos na Meta Ad Library API. Parâmetros mapeados: `search_terms`, `ad_reached_countries=BR`, `ad_active_status=ACTIVE`, `media_type=ALL`
3. Resultados retornam: `ad_copy` (body text do anúncio), `preview_url` (link do preview do criativo), `ad_delivery_start_time` (data início), `days_active` (calculado: hoje - start_time), `publisher_platforms` (facebook, instagram, etc), `page_name` (nome do anunciante)
4. Resultados ordenados por `days_active DESC` — anúncios mais antigos primeiro (proxy de performance: mais tempo ativo = provavelmente lucrativo)
5. Cache implementado via tabela `search_cache`: se existe cache válido (< 24h) para mesma query+source, retorna cache. Senão, busca na API e salva cache
6. Rate limiting respeitado: máximo 200 calls/hora. Se exceder, retorna cache stale com aviso ou mensagem amigável
7. Erro da API (timeout, rate limit, indisponível) retorna fallback gracioso: mensagem "Busca temporariamente indisponível. Faça upload manual da referência." Nunca erro técnico visível ao aluno
8. Integração no quiz: no Caminho 1A, após pergunta Q4 (nicho), seção "Referências Encontradas" aparece com resultados da busca. Aluno pode selecionar referência OU ignorar e seguir com upload manual (2A) ou sem referência (2B)
9. Quando aluno seleciona referência, `creative_references` registrada com todos os metadados. Referência vinculada ao `quiz_session_id`
10. Preview do criativo exibido inline (imagem) ou como thumbnail com link (vídeo). Sem download automático de vídeos — aluno faz upload manual se quiser análise profunda via pipeline do Epic 7

### Story 12.3 — Link Analysis: Cole Qualquer Link Social

As a student,
I want to paste any social media post link and have the AI analyze it automatically,
so that I can use any reference I find online.

**Acceptance Criteria:**

1. `POST /api/references/analyze-link` aceita URL de post social. Detecta plataforma automaticamente via regex: `tiktok.com` → TikTok, `instagram.com/p/` ou `/reel/` → Instagram, `youtube.com/watch` ou `youtu.be` ou `/shorts/` → YouTube, `facebook.com` → Facebook
2. Para cada plataforma, usa API oficial para extrair metadados: YouTube (Data API v3 → title, views, likes, duration, thumbnail, publishedAt), Instagram (oEmbed → thumbnail, title, author; Graph API se disponível → likes, comments), TikTok (oEmbed → title, author, thumbnail; Research API se aprovada → views, likes, shares), Facebook (oEmbed → title, author, thumbnail)
3. Se mídia é imagem: exibe inline + envia para Claude Vision para classificação automática de formato
4. Se mídia é vídeo: exibe thumbnail + metadados. Aluno pode optar por "Analisar vídeo completo" que abre upload manual para pipeline do Epic 7 (AssemblyAI + FFmpeg + Vision)
5. Classificação de formato via Claude Vision (`claude-haiku-4-5-20251001` para economia): analisa thumbnail/imagem e retorna formato classificado (top 5, testemunho, tutorial, etc) com confiança (alta/média/baixa). Se confiança baixa, sugere ao aluno confirmar/corrigir
6. Custo da classificação em créditos: deduzido do saldo do aluno (mesma lógica FR5). Gate pré-chamada inclui tokens da imagem
7. Resultado salvo em `creative_references` com `source_url`, metadados extraídos, `format_classification` e `structure_analysis`
8. Componente reutilizável `<LinkAnalyzer />`: input de URL com paste detection, loading state durante análise, card de resultado com preview + metadados + formato classificado. Usado no quiz (Caminhos 1A e 1B) e como feature standalone em `/references`
9. Erro de URL inválida ou plataforma não suportada: mensagem clara ao aluno. Erro de API: fallback "Não foi possível analisar este link. Tente fazer upload manual."

### Story 12.4 — Busca de Conteúdos Orgânicos Virais

As a student doing the Organic Video path (1B),
I want to search viral organic content in my niche,
so that I can model my video after proven viral references.

**Acceptance Criteria:**

1. `GET /api/references/organic?q={query}&platforms=tiktok,youtube,instagram&limit=20` busca conteúdos orgânicos virais em múltiplas plataformas
2. **YouTube Data API v3:** busca por keyword com filtro `type=video`, `videoDuration=short` (< 4min), `order=viewCount`, `regionCode=BR`, `relevanceLanguage=pt`. Retorna: title, views, likes, comments, duration, thumbnail URL, publishedAt, channelTitle. Quota: 100 units por search (100 buscas/dia com 10k units)
3. **TikTok Research API:** busca por keyword/hashtag com filtro de região e período. Retorna: views, likes, shares, comments, duration, music info, create_time. Se API não aprovada ainda: feature desabilitada para TikTok com mensagem "Em breve" (sem erro)
4. **Instagram Graph API:** busca por hashtag (requer Instagram Business Account conectada via Meta Developer App). Retorna: top posts da hashtag com likes, comments, permalink, media_url, timestamp. Limitação: 30 resultados por hashtag, últimos 7 dias para top_media
5. Resultados consolidados de todas as plataformas em lista unificada, ordenados por engajamento (views para vídeo, likes+comments para imagens). Badge de plataforma em cada resultado (ícone TikTok/YouTube/Instagram)
6. Cache por busca: 12h para orgânico (conteúdo muda mais rápido que ads). Implementado via tabela `search_cache`
7. Integração no quiz: no Caminho 1B, após pergunta Q4 (nicho), seção "Conteúdos Virais" aparece com resultados. Aluno pode selecionar referência viral para modelar
8. Quando aluno seleciona referência, `creative_references` registrada. Se for vídeo, aluno pode optar por upload para análise profunda via Epic 7 ou seguir com metadados + thumbnail apenas
9. Filtros no frontend: plataforma (TikTok/YouTube/Instagram/todos), período (7d/30d), tipo (vídeo/imagem). Filtros aplicados client-side sobre resultados já buscados
10. Cada plataforma que falhar não impede as outras de retornar resultados. Fallback por plataforma independente

### Story 12.5 — Classificação Automática de Formato

As a developer,
I want the AI to automatically classify the format of any creative reference,
so that the format feeds into the script generation prompt.

**Acceptance Criteria:**

1. Função `classifyFormat(mediaUrl | imageBuffer, adCopy?)` envia mídia para Claude Vision (`claude-haiku-4-5-20251001`) com prompt de classificação
2. Formatos reconhecidos (enum `CreativeFormat`): `TOP_5`, `BEFORE_AFTER`, `THIS_OR_THAT`, `TESTIMONIAL`, `TUTORIAL`, `INFORMATIVE`, `LOW_FI`, `PROVOCATION`, `QUESTION`, `RANKING`, `CURIOSITY`, `TRANSFORMATION`, `BEHIND_SCENES`, `UNBOXING`, `POV`, `STORYTELLING`, `CHALLENGE`, `OTHER`
3. Retorno tipado: `{ format: CreativeFormat, confidence: 'HIGH' | 'MEDIUM' | 'LOW', reasoning: string }`
4. Se confiança `LOW`: UI mostra classificação com badge amarelo "Verificar" + dropdown para aluno corrigir. Se `HIGH`: mostra como definitivo com opção de editar
5. Formato classificado (ou corrigido) salvo em `creative_references.format_classification` (ou `format_corrected` se aluno alterou)
6. Formato alimenta diretamente a seleção de módulos contextuais no prompt de geração (camada 2 do Prompt Architecture) — Ex: formato `TOP_5` ativa módulo "estrutura de lista com contagem regressiva"
7. Custo em créditos: classificação via Haiku é barata (~0.5-1 crédito por classificação). Deduzido do saldo. Gate pré-chamada funciona normalmente
8. Batch classification: quando busca retorna 20 resultados, sistema classifica apenas os 5 primeiros automaticamente (economia de créditos). Demais classificados sob demanda quando aluno clica
9. Classification cache: se mesma `source_url` já foi classificada, reutiliza resultado sem nova chamada IA

### Story 12.6 — Integração com Quiz: Reference Picker

As a student,
I want to pick a reference from search results directly in the quiz flow,
so that the AI uses my chosen reference to generate the script.

**Acceptance Criteria:**

1. Componente `<ReferencePicker />` integrado ao quiz entre a seção Quiz Inicial e os Caminhos 2A/2B
2. Se Caminho 1A (Anúncio): exibe busca de ads (Story 12.2) com campo de busca pré-preenchido com nicho do onboarding. Se Caminho 1B (Orgânico): exibe busca de virais (Story 12.4) com campo pré-preenchido
3. Aluno pode: (a) selecionar referência da busca, (b) colar link de post social (Story 12.3), (c) fazer upload manual de vídeo (Caminho 2A existente), (d) pular e criar do zero (Caminho 2B)
4. Ao selecionar referência da busca ou via link: `creative_references` criada e vinculada ao quiz session, formato classificado automaticamente (Story 12.5), se vídeo e aluno quer análise profunda → redirect para upload manual (pipeline Epic 7), se imagem ou thumbnail suficiente → análise de estrutura via Vision e segue no quiz
5. A referência selecionada e sua análise alimentam o prompt de geração do roteiro (Story 6.5): formato classificado, ad copy, estrutura analisada, metadados de engajamento. Adicionados como bloco de contexto no prompt
6. Quiz session registra `reference_source` (enum: API_SEARCH | LINK_ANALYSIS | MANUAL_UPLOAD | NONE) para analytics
7. UX: tela dividida — busca/resultados à esquerda, preview da referência selecionada à direita. Mobile: tabs entre busca e preview
8. Loading states para: busca em andamento, classificação de formato, análise de link. Empty state quando busca não retorna resultados: "Nenhuma referência encontrada. Tente outro termo ou faça upload manual."

### Story 12.7 — Admin: API Configurations & Enrichment

As a SOL administrator,
I want to configure API integrations and enrichment layers from the admin panel,
so that I can manage external services without code changes.

**Acceptance Criteria:**

1. Página `/admin/integrations` (protegida por `role: ADMIN`) lista todas as APIs configuradas com status (ativa/inativa), rate limit atual vs usado, e última verificação de saúde
2. Admin pode ativar/desativar cada API individualmente. API desativada: feature correspondente oculta no quiz. Nunca erro — simplesmente não aparece
3. Admin pode configurar enrichment layer: URL da API, nome da env var da chave, status ativo/inativo. Enrichment desativado: busca usa apenas APIs oficiais
4. Health check: botão "Testar Conexão" para cada API. Faz chamada de teste e reporta: OK (latência), erro (mensagem), rate limit (restante)
5. Métricas de uso por API: total de chamadas hoje/7d/30d, cache hits vs misses, erros por período. Dados da tabela `search_cache` e logs
6. Novas env vars documentadas no `.env.example`: `META_AD_LIBRARY_ACCESS_TOKEN`, `YOUTUBE_API_KEY`, `TIKTOK_RESEARCH_CLIENT_KEY`, `TIKTOK_RESEARCH_CLIENT_SECRET`, `INSTAGRAM_ACCESS_TOKEN`, `ENRICHMENT_API_KEY` (opcional), `ENRICHMENT_API_URL` (opcional)
7. Todas as rotas `/api/admin/integrations/*` verificam `role: ADMIN` server-side

### Story 12.8 — Análise de Perfis de Concorrentes

As a student,
I want to analyze a competitor's social media profile,
so that I can see what content works for them and model mine.

**Acceptance Criteria:**

1. Página `/references/competitors` (protegida por auth) permite aluno adicionar perfis de concorrentes por @ ou URL
2. `POST /api/references/competitors` recebe handle/URL, detecta plataforma, busca últimos 20 posts via API oficial
3. Posts ordenados por engajamento. Exibe: thumbnail, caption resumida, métricas (views/likes/comments), data, formato classificado (batch — top 5 posts classificados auto)
4. Aluno pode "Usar como Referência" em qualquer post → cria `creative_references` e pode ser selecionado no próximo quiz
5. Dados salvos em `competitor_profiles` com `top_posts` (JSON dos posts mais relevantes). Refresh manual via botão "Atualizar" (respeitando rate limits)
6. Limite: 5 perfis de concorrentes por aluno (MVP). CRUD completo: adicionar, remover perfis
7. Feature complementar — fora do quiz principal. Acessível via sidebar "Concorrentes" no menu de navegação

### Story 12.9 — Enrichment Layer: Terceiros (Opcional)

As a developer,
I want an optional enrichment layer that adds historical data from third-party APIs,
so that search results are richer when the service is available.

**Acceptance Criteria:**

1. Service `EnrichmentService` em `apps/web/lib/services/enrichment.ts` com interface genérica: `search(query, type: 'ads'|'organic'): EnrichmentResult[]`
2. Adapter pattern: `AdSpyAdapter`, `BigSpyAdapter`, `ApifyAdapter` implementam mesma interface. Admin configura qual adapter usar via `api_configurations`
3. Enrichment é chamado em paralelo com APIs oficiais. Timeout: 5 segundos. Se não responder a tempo, resultado descartado silenciosamente
4. Resultados do enrichment exibidos em seção separada "Referências Históricas" com badge "Histórico". Nunca misturados com resultados oficiais sem distinção
5. Deduplicação: se mesmo criativo aparece na API oficial e no enrichment, mantém apenas o da API oficial (dados mais confiáveis)
6. Se enrichment indisponível (API fora, desativado pelo admin, timeout): nenhum erro visível. Seção "Referências Históricas" simplesmente não aparece. Aluno não sabe que existia algo a mais
7. Custo do enrichment ($99-149/mês) é custo operacional fixo do SOL — não repassado ao aluno via créditos. Chamadas ao enrichment não consomem créditos do aluno
8. Logs de uso do enrichment para admin: chamadas, hits, erros, latência. Disponível em `/admin/integrations`

---

## Checklist Results Report

### Category Statuses

| Category                         | Status  | Notes                                                                                                          |
| -------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| 1. Problem Definition & Context  | ✅ PASS | Problema claro (saturação leilão), audiência específica (alunos Space), métrica de sucesso mensurável (<30min) |
| 2. MVP Scope Definition          | ✅ PASS | In/out of scope explícitos, foco correto em chat + auth + créditos + pagamento                                 |
| 3. User Experience Requirements  | ✅ PASS | Flows primários documentados, telas definidas, estado de erro (inline) especificado                            |
| 4. Functional Requirements       | ✅ PASS | FR1–FR41 testáveis, cobrindo todos os flows do MVP + quiz + onboarding + video + anexos + admin + feedback loop + ad intelligence |
| 5. Non-Functional Requirements   | ✅ PASS | Performance (3s streaming), segurança (JWT, bcrypt), infra (Docker, VPS), zeroing lock-in                      |
| 6. Epic & Story Structure        | ✅ PASS | 9 epics (incl. 5.5, 6, 7, 8, 12), stories dimensionadas para sessão de agente, ACs testáveis                        |
| 7. Technical Guidance            | ✅ PASS | Stack completo definido em tech-stack.md, arquitetura monolith justificada, restrições explícitas              |
| 8. Cross-Functional Requirements | ✅ PASS | Schema definido por story, integração Stripe com idempotência, deploy via Docker                               |
| 9. Clarity & Communication       | ✅ PASS | Documento estruturado, terminologia consistente, changelog incluído                                            |

**Completeness:** ~97% | **MVP Scope:** Just Right | **Readiness:** ✅ READY FOR ARCHITECT

### Gaps Identificados (LOW priority)

- Persona formal do usuário (aluno Space) não documentada — informação existe no contexto mas não em seção própria
- Política de retenção de dados não especificada (conversas antigas)
- Monitoring/alerting pós-deploy não coberto no MVP (aceitável)

---

## Next Steps

### Architect Prompt (v4.0)

> @architect — O PRD do SOL foi atualizado para v12.0 (`docs/prd.md`). Mudanças principais: (1) Novo Epic 12 (Ad Intelligence & Content Discovery) com 9 stories (12.1-12.9). (2) FR35-FR41: busca de ads (Meta Ad Library), orgânicos virais (YouTube/TikTok/Instagram), análise de link, classificação de formato via Vision, integração quiz, admin integrações, concorrentes, enrichment. (3) API Gateway pattern com cache (PostgreSQL), rate limiting, fallback chain. (4) 4 novas tabelas: creative_references, search_cache, api_configurations, competitor_profiles. (5) 6 novas env vars para APIs externas. Atualize `docs/architecture.md` para v4.0.

### Scrum Master Prompt

> @sm — O PRD (v12.0) e a Arquitetura (v4.0) do SOL foram atualizados. Crie user stories para Epic 12 (Ad Intelligence & Content Discovery — 9 stories: 12.1–12.9). Siga o padrão das stories existentes em `docs/stories/`. Inclua: ACs copiados do PRD, Tasks e Subtasks detalhados, Dev Notes (API Gateway pattern, cache first, fallback chain, timezone America/Sao_Paulo), Definition of Done. Ordem de implementação: 12.1 (Schema) → 12.2 (Meta Ads) → 12.3 (Link Analysis) → 12.5 (Classificação) → 12.6 (Quiz Integration) → 12.4 (Orgânicos) → 12.7 (Admin) → 12.8 (Concorrentes) → 12.9 (Enrichment).
