# Story 1.3 — Authentication: Register & Login

**Epic:** 1 — Foundation & Auth
**Story ID:** 1.3
**Priority:** High
**Estimate:** 5-8 story points
**Status:** In Progress

---

## User Story

**As a** student,
**I want** to create an account and log in with email and password,
**so that** I can access the SOL platform securely.

---

## Context

Esta story implementa o sistema completo de autenticação do SOL usando NextAuth.js v5 com Credentials Provider. O fluxo cobre registro de novos usuários (com hash bcrypt de senhas), login com validação contra o banco de dados PostgreSQL, gestão de sessões via JWT em cookies httpOnly, e proteção de rotas privadas. A segurança é crítica: mensagens de erro nunca devem revelar se um email existe no sistema, e senhas devem ser hasheadas com mínimo 10 rounds de bcrypt.

---

## Acceptance Criteria

### AC1: Rota de Registro de Usuário (`POST /api/auth/register`)

- [ ] Endpoint `POST /api/auth/register` criado em `apps/web/app/api/auth/register/route.ts`
- [ ] Recebe `{ email: string, password: string }` via JSON body
- [ ] Validações implementadas:
  - Email em formato válido (regex ou lib de validação)
  - Senha com mínimo 8 caracteres
  - Retorna erro 400 se validações falharem
- [ ] Verifica se email já existe no banco
  - Se existe: retorna erro 409 com mensagem genérica "Email já cadastrado"
- [ ] Hasheia senha com bcrypt (min 10 rounds)
- [ ] Cria usuário no banco via Prisma com:
  - `email`, `passwordHash`, `credits: 0` (default)
- [ ] Retorna status 201 com `{ message: "Usuário criado com sucesso" }`
- [ ] Em caso de erro interno, retorna 500 sem expor detalhes sensíveis

**Test:** Via Postman/curl, enviar POST com email válido → 201. Repetir com mesmo email → 409. Verificar no banco que senha está hasheada, não plain text.

---

### AC2: NextAuth.js v5 Configurado com Credentials Provider

- [ ] NextAuth.js v5 instalado: `pnpm add next-auth@beta @auth/prisma-adapter`
- [ ] Arquivo `apps/web/app/api/auth/[...nextauth]/route.ts` criado
- [ ] Configuração NextAuth com:
  - `providers: [CredentialsProvider]` validando email + senha contra banco
  - Query Prisma busca usuário por email
  - Valida senha com `bcrypt.compare()`
  - Se inválido, retorna erro genérico "Credenciais inválidas" (não revela se email existe)
- [ ] Session strategy: `jwt` (não database sessions)
- [ ] JWT em cookie httpOnly, secure (HTTPS em produção), sameSite: lax
- [ ] Token expira em 7 dias (`maxAge: 7 * 24 * 60 * 60`)
- [ ] Callback `jwt()` adiciona `userId` e `email` ao token
- [ ] Callback `session()` adiciona `user.id` e `user.email` à session

**Test:** Login com credenciais corretas → sessão criada, cookie `next-auth.session-token` presente. Login com credenciais erradas → erro 401.

---

### AC3: Páginas de Login e Registro com Validação

- [ ] Página `/login` criada em `apps/web/app/login/page.tsx`
  - Formulário com campos: email, senha
  - Botão "Entrar"
  - Link para `/register` ("Não tem conta? Cadastre-se")
  - Validação client-side: email format, senha min 8 chars
  - Ao submeter, chama `signIn('credentials', { email, password })` do NextAuth
  - Exibe mensagens de erro genéricas em caso de falha
  - Em sucesso, redireciona para `/dashboard` (ou rota padrão)
- [ ] Página `/register` criada em `apps/web/app/register/page.tsx`
  - Formulário com campos: email, senha, confirmar senha
  - Validação: senhas devem coincidir
  - Botão "Criar Conta"
  - Link para `/login` ("Já tem conta? Faça login")
  - Ao submeter, chama `POST /api/auth/register`
  - Em sucesso, redireciona para `/login` com mensagem de sucesso
  - Exibe erros retornados pela API (409, 400)
- [ ] Ambas as páginas estilizadas com Tailwind (tema dark será Story 1.4, por ora usar tema padrão limpo)

**Test:** Acessar `/register`, criar usuário → redireciona para `/login`. Fazer login → redireciona para dashboard/home autenticada.

---

### AC4: Proteção de Rotas Privadas

- [ ] Middleware criado em `apps/web/middleware.ts` usando `withAuth` do NextAuth
- [ ] Rotas protegidas por padrão: `/dashboard/*`, `/chat/*`, `/credits/*`
- [ ] Se não autenticado, redireciona para `/login` com `callbackUrl` preservado
- [ ] Rotas públicas: `/login`, `/register`, `/` (landing page futura)
- [ ] Verificação de sessão server-side em componentes via `getServerSession()`

**Test:** Tentar acessar `/dashboard` sem estar logado → redireciona para `/login?callbackUrl=/dashboard`. Após login, retorna para `/dashboard`.

---

### AC5: Logout Funcional

- [ ] Componente de logout implementado (pode ser botão no header ou link)
- [ ] Ao clicar, chama `signOut({ callbackUrl: '/login' })` do NextAuth
- [ ] Sessão encerrada, cookie removido
- [ ] Usuário redirecionado para `/login`

**Test:** Usuário logado clica em "Sair" → sessão encerrada, redireciona para `/login`. Tentar acessar rota protegida novamente → redireciona para `/login`.

---

### AC6: Segurança e Mensagens de Erro

- [ ] Mensagens de erro nunca revelam se email existe ou não
  - Login falho: "Credenciais inválidas" (genérico)
  - Registro: apenas "Email já cadastrado" se conflito (409)
- [ ] Senhas nunca logadas em console ou arquivos de log
- [ ] Variáveis sensíveis (`NEXTAUTH_SECRET`, `NEXTAUTH_URL`) em `.env`, nunca hardcodadas
- [ ] Rate limiting básico (opcional para MVP, mas recomendado): max 5 tentativas de login por minuto por IP

**Test:** Tentar login com email inexistente → mensagem genérica. Tentar login com email válido mas senha errada → mesma mensagem genérica.

---

## Technical Implementation Notes

### Dependencies

Adicionar ao `apps/web/package.json`:

```json
{
  "dependencies": {
    "next-auth": "^5.0.0-beta.4",
    "@auth/prisma-adapter": "^1.0.0",
    "bcryptjs": "^2.4.3"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6"
  }
}
```

### NextAuth Configuration Structure

**Arquivo:** `apps/web/app/api/auth/[...nextauth]/route.ts`

```typescript
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@sol/db';
import * as bcrypt from 'bcryptjs';

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user) {
          return null; // Mensagem genérica no frontend
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
        };
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 dias
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
```

### Register Route Structure

**Arquivo:** `apps/web/app/api/auth/register/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@sol/db';
import * as bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    // Validações
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Senha deve ter no mínimo 8 caracteres' },
        { status: 400 }
      );
    }

    // Verifica se email já existe
    const existing = await prisma.user.findUnique({
      where: { email }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Email já cadastrado' },
        { status: 409 }
      );
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(password, 10);

    // Cria usuário
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        credits: 0,
      }
    });

    return NextResponse.json(
      { message: 'Usuário criado com sucesso' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
```

### Middleware Structure

**Arquivo:** `apps/web/middleware.ts`

```typescript
import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: ['/dashboard/:path*', '/chat/:path*', '/credits/:path*'],
};
```

---

## Dependencies

- **Blocked by:** Story 1.2 (Database Schema deve estar completo)
- **Blocks:** Story 1.4 (Layout Shell precisa de autenticação para exibir saldo de créditos)

---

## Testing Checklist

- [ ] Criar usuário via `/register` → sucesso (201)
- [ ] Tentar criar mesmo usuário novamente → erro 409
- [ ] Login com credenciais corretas → sessão criada, redirecionamento funcional
- [ ] Login com credenciais incorretas → erro genérico
- [ ] Acessar rota protegida sem login → redireciona para `/login`
- [ ] Logout → sessão encerrada, cookie removido
- [ ] Verificar no banco que senha está hasheada (não plain text)
- [ ] `pnpm run typecheck` passa sem erros

---

## Definition of Done

- [ ] Todos os ACs validados manualmente
- [ ] Rota de registro funcionando e testada
- [ ] NextAuth.js configurado e login funcional
- [ ] Páginas `/login` e `/register` criadas e funcionais
- [ ] Middleware de proteção de rotas implementado
- [ ] Logout funcionando corretamente
- [ ] Code review aprovado
- [ ] Nenhum erro de TypeScript (strict mode)
- [ ] Documentação atualizada no README se necessário

---

## References

- **PRD:** [docs/prd.md](../../prd.md) — FR1, FR2, Story 1.3
- **NextAuth.js v5 Docs:** https://authjs.dev/getting-started/providers/credentials
- **Bcrypt Best Practices:** https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html

---

## Notes for Developers

Esta é a story mais crítica do Epic 1 — toda a segurança da plataforma depende desta implementação. Atenção especial para:

1. **Nunca revelar se email existe** nas mensagens de erro de login
2. **Sempre hashear senhas** com bcrypt >= 10 rounds
3. **JWT em httpOnly cookie** — nunca em localStorage
4. **Variáveis sensíveis** sempre em `.env`

**Próxima Story:** 1.4 — Layout Shell & Dark Theme
