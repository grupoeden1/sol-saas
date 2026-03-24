'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { loginAction } from './actions';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setSuccessMessage('Conta criada com sucesso! Faça login para continuar.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await loginAction(email, password);

      if (!result.success) {
        setError(result.error || 'Credenciais inválidas');
        return;
      }

      const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError('Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 rounded-full bg-solar-500/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <Logo size={48} className="mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Entrar no SOL</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Acesse sua conta para criar criativos
          </p>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-6 rounded-lg border border-green-500/50 bg-green-500/10 px-4 py-3 text-sm text-green-400">
            {successMessage}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="rounded-2xl border border-solar-800/20 bg-background-secondary p-8">
          <div className="mb-5">
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground-muted">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full rounded-lg border border-solar-800/30 bg-background px-4 py-2.5 text-foreground placeholder:text-foreground-muted/40 transition-all focus-solar focus:border-solar-500/50"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground-muted">
              Senha
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-solar-800/30 bg-background px-4 py-2.5 text-foreground placeholder:text-foreground-muted/40 transition-all focus-solar focus:border-solar-500/50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-solar-500 py-2.5 text-sm font-semibold text-background transition-all hover:bg-solar-600 hover:shadow-lg hover:shadow-solar-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        {/* Forgot Password + Register Links */}
        <div className="mt-6 space-y-3 text-center text-sm text-foreground-muted">
          <p>
            <Link href="/forgot-password" className="font-medium text-solar-400/70 transition-all hover:text-solar-300">
              Esqueci minha senha
            </Link>
          </p>
          <p>
            Não tem conta?{' '}
            <Link href={searchParams.get('ref') ? `/register?ref=${encodeURIComponent(searchParams.get('ref')!)}` : '/register'} className="font-medium text-solar-400 transition-all hover:text-solar-300">
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><div className="text-foreground">Carregando...</div></div>}>
      <LoginForm />
    </Suspense>
  );
}
