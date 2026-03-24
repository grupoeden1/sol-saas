'use client';

import { useState } from 'react';

interface ResetPasswordButtonProps {
  userId: string;
  userEmail: string;
}

export default function ResetPasswordButton({ userId, userEmail }: ResetPasswordButtonProps) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Mínimo 8 caracteres');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Erro ao resetar senha');
      }

      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setPassword('');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-solar-800/30 px-2.5 py-1 text-xs text-foreground-muted transition-all hover:border-solar-500/30 hover:text-foreground"
      >
        Resetar Senha
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-solar-800/30 bg-background-secondary p-6 shadow-2xl">
            <h3 className="mb-1 text-base font-semibold text-foreground">Resetar Senha</h3>
            <p className="mb-4 text-xs text-foreground-muted truncate">{userEmail}</p>

            {success ? (
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-center">
                <p className="text-sm text-green-400">Senha atualizada!</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {error && (
                  <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                    {error}
                  </div>
                )}

                <div className="mb-4">
                  <label className="mb-1.5 block text-sm font-medium text-foreground-muted">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full rounded-lg border border-solar-800/30 bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted/40 outline-none transition focus:border-solar-500/50 focus:ring-1 focus:ring-solar-500/20"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg bg-solar-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-solar-400 disabled:opacity-50"
                  >
                    {loading ? 'Salvando...' : 'Confirmar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOpen(false); setError(''); setPassword(''); }}
                    className="rounded-lg border border-solar-800/30 px-4 py-2 text-sm text-foreground-muted transition-all hover:border-solar-500/30"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
