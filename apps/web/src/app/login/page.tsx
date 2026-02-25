'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
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

      // Sucesso - redireciona para dashboard
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
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="text-center mb-4">
            <span className="text-6xl">☀️</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
            Entrar no SOL
          </h2>
          <p className="mt-2 text-center text-sm text-foreground-muted">
            Ou{' '}
            <Link href="/register" className="font-medium text-solar-300 hover:text-solar-400 transition-colors">
              crie sua conta gratuitamente
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-solar-800/30 bg-background-secondary placeholder-foreground-muted text-foreground rounded-t-md focus:outline-none focus:ring-2 focus:ring-solar-500 focus:border-solar-500 focus:z-10 sm:text-sm"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-solar-800/30 bg-background-secondary placeholder-foreground-muted text-foreground rounded-b-md focus:outline-none focus:ring-2 focus:ring-solar-500 focus:border-solar-500 focus:z-10 sm:text-sm"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {successMessage && (
            <div className="rounded-md bg-green-500/10 border border-green-500/50 p-4">
              <div className="text-sm text-green-400">{successMessage}</div>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-500/10 border border-red-500/50 p-4">
              <div className="text-sm text-red-400">{error}</div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-solar-500/50 text-sm font-medium rounded-md text-foreground bg-solar-500/10 hover:bg-solar-500/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-solar-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>
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
