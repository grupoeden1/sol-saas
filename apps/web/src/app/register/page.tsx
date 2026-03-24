'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterPageContent />
    </Suspense>
  );
}

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [refCode, setRefCode] = useState<string | null>(null);

  // Capture referral code from URL and set cookie
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref && /^[A-Z0-9]{8}$/i.test(ref)) {
      const code = ref.toUpperCase();
      setRefCode(code);
      // Set referral cookie via API
      fetch('/api/referral/set-cookie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      }).catch(() => {
        // Silently ignore cookie-setting errors
      });
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password || !confirmPassword) {
      setError('Todos os campos são obrigatórios');
      return;
    }

    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, ...(refCode ? { ref: refCode } : {}) }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao criar conta');
        return;
      }

      // Auto-login after successful registration
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.ok) {
        router.push('/dashboard');
      } else {
        // Fallback: redirect to login if auto-login fails
        router.push('/login?registered=true');
      }
    } catch {
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-solar-500/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <Logo size={48} className="mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Criar conta no SOL</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Comece a criar criativos personalizados
          </p>
        </div>

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

          <div className="mb-5">
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground-muted">
              Senha
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="w-full rounded-lg border border-solar-800/30 bg-background px-4 py-2.5 text-foreground placeholder:text-foreground-muted/40 transition-all focus-solar focus:border-solar-500/50"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-foreground-muted">
              Confirmar senha
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a senha"
              className="w-full rounded-lg border border-solar-800/30 bg-background px-4 py-2.5 text-foreground placeholder:text-foreground-muted/40 transition-all focus-solar focus:border-solar-500/50"
            />
            {password && confirmPassword && password !== confirmPassword && (
              <p className="mt-1.5 text-xs text-red-400">As senhas não coincidem.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-solar-500 py-2.5 text-sm font-semibold text-background transition-all hover:bg-solar-600 hover:shadow-lg hover:shadow-solar-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        {/* Login Link */}
        <p className="mt-6 text-center text-sm text-foreground-muted">
          Já tem conta?{' '}
          <Link href="/login" className="font-medium text-solar-400 transition-all hover:text-solar-300">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
