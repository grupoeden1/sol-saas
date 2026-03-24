'use client';

import { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Senha deve ter no mínimo 8 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Erro ao redefinir senha');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 rounded-full bg-solar-500/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <Logo size={48} className="mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Redefinir Senha</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Informe seu email e defina uma nova senha
          </p>
        </div>

        {success ? (
          <div className="rounded-2xl border border-solar-800/20 bg-background-secondary p-8 text-center">
            <div className="mb-4 inline-flex rounded-full bg-green-500/10 p-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="mb-2 text-lg font-semibold text-foreground">Senha redefinida!</h2>
            <p className="mb-6 text-sm text-foreground-muted">
              Sua senha foi atualizada com sucesso. Agora você pode fazer login com a nova senha.
            </p>
            <Link
              href="/login"
              className="inline-flex rounded-lg bg-solar-500 px-6 py-2.5 text-sm font-semibold text-background transition-all hover:bg-solar-600"
            >
              Ir para Login
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

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

              <div className="mb-5">
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground-muted">
                  Nova Senha
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full rounded-lg border border-solar-800/30 bg-background px-4 py-2.5 text-foreground placeholder:text-foreground-muted/40 transition-all focus-solar focus:border-solar-500/50"
                />
              </div>

              <div className="mb-6">
                <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-foreground-muted">
                  Confirmar Nova Senha
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full rounded-lg border border-solar-800/30 bg-background px-4 py-2.5 text-foreground placeholder:text-foreground-muted/40 transition-all focus-solar focus:border-solar-500/50"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-solar-500 py-2.5 text-sm font-semibold text-background transition-all hover:bg-solar-600 hover:shadow-lg hover:shadow-solar-500/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Redefinindo...' : 'Redefinir Senha'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-foreground-muted">
              Lembrou sua senha?{' '}
              <Link href="/login" className="font-medium text-solar-400 transition-all hover:text-solar-300">
                Voltar ao Login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
