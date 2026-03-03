# SOL - Criador de Roteiros com Inteligência Artificial

> SaaS quiz-first com IA para criação de roteiros de anúncios e vídeos orgânicos para infoprodutos.

**Desenvolvido para:** Alunos do Space (Eden Corporate)
**Objetivo:** Escalar a entrega de valor que hoje só acontece via mentoria 1:1 em formato SaaS recorrente

---

## Visão Geral

O SOL resolve o problema de saturação no leilão de anúncios causado por alunos do Space vendendo o mesmo produto com os mesmos criativos. Via quiz estruturado + IA, o aluno descreve seu produto, público e contexto, e recebe um roteiro completamente novo e personalizado.

### Status do Desenvolvimento

- ✅ **Epic 1:** Foundation & Auth (COMPLETO)
- ⏳ **Epic 2:** Chat Core com IA (IN PROGRESS)
- ⏳ **Epic 3:** Créditos & Pagamentos (PARCIAL)
- ⏳ **Epic 4:** Admin & Operações (PARCIAL)
- ⏳ **Epic 6:** Quiz & Onboarding (TODO)
- ⏳ **Epic 7:** Video Processing (TODO)

---

## Tech Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14, React 18, TypeScript (strict), Tailwind CSS |
| Backend | Next.js API Routes, Prisma ORM |
| Database | PostgreSQL 17 (Docker) |
| Auth | NextAuth.js v5 (email/password, JWT) |
| AI | OpenAI (GPT-4o, GPT-4o-mini) |
| Payments | Stripe (Checkout + Webhooks) |
| Monorepo | Turborepo + pnpm |
| CI/CD | GitHub Actions |

**Princípio: Zero Lock-in** — Toda a infraestrutura pode ser migrada sem parar a operação.

---

## Setup Local

### Pré-requisitos

- **Node.js** 20.x ou superior
- **pnpm** 10.x ou superior
- **Docker** e Docker Compose
- **Git**

### Instalação

1. **Clone o repositório**

   ```bash
   git clone <repository-url>
   cd sol-saas
   ```

2. **Configure as variáveis de ambiente**

   ```bash
   cp .env.example .env
   ```

   Edite o `.env` e gere o `AUTH_SECRET`:
   ```bash
   openssl rand -base64 32
   ```

3. **Inicie o PostgreSQL com Docker**

   ```bash
   docker compose up -d
   ```

4. **Instale as dependências**

   ```bash
   pnpm install
   ```

5. **Configure o banco de dados**

   ```bash
   pnpm db:migrate
   ```

6. **Inicie o servidor de desenvolvimento**

   ```bash
   pnpm dev
   ```

7. **Acesse a aplicação** em [http://localhost:3000](http://localhost:3000)

---

## Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `pnpm dev` | Inicia o servidor de desenvolvimento (Turbo) |
| `pnpm build` | Compila a aplicação para produção |
| `pnpm lint` | Executa o linter em todos os pacotes |
| `pnpm typecheck` | Verifica tipos TypeScript |
| `pnpm test` | Executa os testes |
| `pnpm db:migrate` | Cria e aplica migrations do Prisma |
| `pnpm db:generate` | Regenera o Prisma Client |
| `pnpm db:studio` | Abre o Prisma Studio (GUI do banco) |
| `pnpm db:push` | Envia schema direto para o banco (apenas dev) |

---

## Estrutura do Projeto

```
sol-saas/
├── apps/
│   └── web/                    # Aplicação Next.js principal
│       └── src/
│           ├── app/            # App Router (pages + API routes)
│           ├── components/     # Componentes React
│           ├── lib/            # Utilitários e configs
│           └── types/          # Tipos TypeScript
├── packages/
│   └── db/                     # Pacote Prisma compartilhado (@sol/db)
│       ├── prisma/
│       │   └── schema.prisma   # Schema do banco
│       └── src/                # Repo functions (credits, pricing, admin)
├── docs/                       # Documentação do projeto
│   ├── framework/              # Tech stack, coding standards
│   ├── stories/                # User stories por epic
│   ├── workflows/              # Workflows de automação
│   ├── prd.md                  # Product Requirements v9.0
│   └── architecture.md         # Arquitetura v7.0
├── .github/workflows/          # CI/CD GitHub Actions
├── docker-compose.yml          # PostgreSQL 17 containerizado
├── turbo.json                  # Configuração Turborepo
└── package.json                # Workspace raiz (pnpm)
```

---

## Desenvolvimento

### Adicionando Migrations

```bash
# 1. Modifique packages/db/prisma/schema.prisma
# 2. Execute:
pnpm db:migrate
```

### Visualizando o Banco de Dados

```bash
pnpm db:studio
# Abre em http://localhost:5555
```

### Padrões de Código

Veja [docs/framework/coding-standards.md](docs/framework/coding-standards.md) para nomenclatura, estrutura de API Routes e boas práticas.

---

## CI/CD

O projeto usa GitHub Actions (`.github/workflows/ci.yml`):

- **Trigger:** Push e PRs para `main`
- **Pipeline:** Install → Prisma Generate → Lint → Typecheck → Build
- **Serviços:** PostgreSQL 17 Alpine
- **Cache:** pnpm store

---

## Documentação

- [PRD v9.0](docs/prd.md)
- [Arquitetura v7.0](docs/architecture.md)
- [Tech Stack](docs/framework/tech-stack.md)
- [Coding Standards](docs/framework/coding-standards.md)
- [Source Tree](docs/framework/source-tree.md)

---

## Troubleshooting

### PostgreSQL não conecta

```bash
docker compose ps          # Verificar se container está rodando
docker compose restart postgres  # Reiniciar
docker compose logs postgres     # Ver logs
```

### Erro no Prisma Client

```bash
pnpm db:generate           # Regenerar cliente
```

### Build falhando

```bash
pnpm typecheck             # Ver erros de tipagem
rm -rf .turbo && pnpm build  # Limpar cache do Turbo
```

---

**Eden Corporate** — SOL (Space Online Learning) — Todos os direitos reservados.
