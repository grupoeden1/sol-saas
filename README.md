# SOL - Criação de Ofertas com Inteligência Artificial

> SaaS conversacional com IA para criação de ofertas de infoprodutos diferenciadas e scripts de criativos para anúncios digitais.

**Desenvolvido para:** Alunos do Space (Eden Corporate)
**Objetivo:** Escalar a entrega de valor que hoje só acontece via mentoria 1:1 em formato SaaS recorrente

---

## 📋 Visão Geral

O SOL resolve o problema de saturação no leilão de anúncios causado por alunos do Space vendendo o mesmo produto com os mesmos criativos. Via chat com IA, o aluno descreve seu produto, público e contexto, e recebe uma oferta ou script de criativo completamente novo e personalizado em menos de 30 minutos.

### Status do Desenvolvimento

- ✅ **Epic 1 - Story 1.1:** Project Bootstrap & Infrastructure (COMPLETO)
- ⏳ **Epic 1 - Story 1.2:** Database Schema: Users & Sessions (PRÓXIMO)
- ⏳ **Epic 2:** Chat Core com IA
- ⏳ **Epic 3:** Créditos & Pagamentos

---

## 🛠️ Tech Stack

### Frontend

- **Next.js 14** - Framework React com App Router e Server Components
- **TypeScript** - Strict mode, sem `any`
- **Tailwind CSS** - Utility-first CSS com tema dark
- **Shadcn/UI** - Componentes customizáveis (será adicionado em stories futuras)

### Backend

- **Next.js API Routes** - Backend integrado, sem servidor separado
- **Prisma** - ORM type-safe para PostgreSQL
- **PostgreSQL 16** - Banco de dados relacional self-hosted

### Infraestrutura

- **Turborepo** - Monorepo build system
- **Docker Compose** - Containerização local
- **GitHub Actions** - CI/CD automatizado

### Princípio: Zero Lock-in

Toda a infraestrutura pode ser migrada sem parar a operação. Sem Vercel, Railway, Render ou qualquer PaaS em produção.

---

## 🚀 Setup Local

### Pré-requisitos

- **Node.js** 20.x ou superior
- **npm** 10.x ou superior
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

   Edite o `.env` e gere o `NEXTAUTH_SECRET`:
   - No Windows (PowerShell):
     ```powershell
     $bytes = new-object Byte[] 32; (new-object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes); [Convert]::ToBase64String($bytes)
     ```
   - No Unix (OpenSSL):
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

7. **Acesse a aplicação**
   Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

---

## 📦 Scripts Disponíveis

| Script               | Descrição                                                |
| -------------------- | -------------------------------------------------------- |
| `npm run dev`        | Inicia o servidor de desenvolvimento (Turbo)             |
| `npm run build`      | Compila a aplicação para produção                        |
| `npm run lint`       | Executa o linter em todos os pacotes                     |
| `npm run typecheck`  | Verifica tipos TypeScript                                |
| `npm run test`       | Executa os testes (será implementado em stories futuras) |
| `npm run db:migrate` | Cria e aplica migrations do Prisma                       |
| `npm run db:studio`  | Abre o Prisma Studio (GUI do banco)                      |
| `npm run db:push`    | Envia schema direto para o banco (apenas dev)            |

---

## 🏗️ Estrutura do Projeto

```
sol-saas/
├── apps/
│   └── web/                    # Aplicação Next.js principal
│       ├── src/
│       │   ├── app/            # App Router do Next.js
│       │   ├── components/     # Componentes React
│       │   ├── lib/            # Utilitários e configs
│       │   └── types/          # Tipos TypeScript
│       ├── public/             # Assets estáticos
│       ├── next.config.ts      # Configuração Next.js
│       └── tailwind.config.ts  # Configuração Tailwind
├── packages/
│   └── db/                     # Pacote Prisma compartilhado
│       ├── prisma/
│       │   └── schema.prisma   # Schema do banco
│       └── src/
│           └── index.ts        # Cliente Prisma (singleton)
├── docs/                       # Documentação do projeto
│   ├── framework/              # Tech stack, coding standards
│   ├── stories/                # User stories do AIOS
│   ├── prd.md                  # Product Requirements
│   └── architecture.md         # Documento de arquitetura
├── .github/workflows/          # CI/CD GitHub Actions
├── docker-compose.yml          # PostgreSQL containerizado
├── turbo.json                  # Configuração Turborepo
└── package.json                # Workspace raiz
```

---

## 🔧 Desenvolvimento

### Adicionando Migrations

1. Modifique o `packages/db/prisma/schema.prisma`
2. Execute:
   ```bash
   npm run db:migrate
   ```
3. Dê um nome descritivo para a migration quando solicitado

### Visualizando o Banco de Dados

```bash
npm run db:studio
```

Abre o Prisma Studio em [http://localhost:5555](http://localhost:5555)

### Criando Componentes

Componentes React vão em `apps/web/src/components/`. Use:

- PascalCase para nomes de componentes
- TypeScript strict (sem `any`)
- Server Components por padrão (adicione `'use client'` apenas quando necessário)

### Padrões de Código

Veja [docs/framework/coding-standards.md](docs/framework/coding-standards.md) para:

- Nomenclatura de arquivos e variáveis
- Estrutura de API Routes
- Segurança e boas práticas

---

## 🚢 Deploy

### Build de Produção

```bash
npm run build
```

### Deploy via Docker (produção)

Instruções de deploy serão adicionadas em stories futuras. O projeto está preparado para deploy em VPS própria via Docker Compose.

---

## 🧪 CI/CD

O projeto usa GitHub Actions para CI/CD automático:

- **Trigger:** Pull Requests para `main` e pushes para `main`
- **Pipeline:**
  1. Checkout código
  2. Setup Node.js 20
  3. Install dependencies
  4. Generate Prisma Client
  5. Run lint
  6. Run typecheck
  7. Build aplicação

Veja [.github/workflows/ci.yml](.github/workflows/ci.yml) para detalhes.

---

## 📚 Documentação

- [PRD (Product Requirements)](docs/prd.md)
- [Arquitetura](docs/architecture.md)
- [Tech Stack](docs/framework/tech-stack.md)
- [Coding Standards](docs/framework/coding-standards.md)
- [Source Tree](docs/framework/source-tree.md)

---

## 🎯 Roadmap

### Epic 1: Foundation & Auth (Em andamento)

- ✅ Story 1.1 - Project Bootstrap & Infrastructure
- ⏳ Story 1.2 - Database Schema: Users & Sessions
- ⏳ Story 1.3 - Authentication: Register & Login
- ⏳ Story 1.4 - Layout Shell & Dark Theme

### Epic 2: Chat Core com IA (Futuro)

- Chat com streaming OpenAI
- Persistência de histórico
- Estado de créditos insuficientes

### Epic 3: Créditos & Pagamentos (Futuro)

- Sistema de créditos
- Stripe Checkout + PIX
- Webhooks e painel do usuário

---

## 👥 Equipe

**Desenvolvido por:** Eden Corporate
**Produto:** SOL (Space Online Learning)
**Target:** Alunos do programa Space

---

## 📄 Licença

Privado - Eden Corporate. Todos os direitos reservados.

---

## 🆘 Troubleshooting

### PostgreSQL não conecta

1. Verifique se o container está rodando:

   ```bash
   docker compose ps
   ```

2. Reinicie o container:

   ```bash
   docker compose restart postgres
   ```

3. Verifique os logs:
   ```bash
   docker compose logs postgres
   ```

### Erro no Prisma Client

1. Regenere o cliente:

   ```bash
   cd packages/db && npx prisma generate
   ```

2. Se persistir, delete `node_modules` e reinstale:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### Build falhando

1. Execute typecheck para ver erros:

   ```bash
   npm run typecheck
   ```

2. Limpe cache do Turbo:
   ```bash
   rm -rf .turbo
   npm run build
   ```

---

**✨ Pronto para desenvolvimento!** Se tiver dúvidas, consulte a [documentação](docs/) ou abra uma issue.
