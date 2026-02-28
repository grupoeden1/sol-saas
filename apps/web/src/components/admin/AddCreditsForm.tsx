'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface FormState {
  userEmail: string;
  amountBRL: string;
  reason: string;
}

const initialState: FormState = { userEmail: '', amountBRL: '', reason: '' };

type Status = 'idle' | 'confirm' | 'loading' | 'success' | 'error';

export default function AddCreditsForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(form.amountBRL);
    if (!form.userEmail || isNaN(amount) || amount <= 0 || form.reason.trim().length < 3) {
      setErrorMsg('Preencha todos os campos corretamente.');
      setStatus('error');
      return;
    }
    setErrorMsg('');
    setStatus('confirm');
  }

  async function handleConfirm() {
    setStatus('loading');
    try {
      const res = await fetch('/api/admin/add-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: form.userEmail,
          amountBRL: parseFloat(form.amountBRL),
          reason: form.reason,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data?.error ?? 'Erro ao adicionar créditos.');
        setStatus('error');
        return;
      }

      const newBalance = (data.newBalanceCents / 100).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        style: 'currency',
        currency: 'BRL',
      });
      setSuccessMsg(
        `Créditos adicionados com sucesso! Novo saldo de ${form.userEmail}: ${newBalance}`,
      );
      setForm(initialState);
      setStatus('success');
      router.refresh();
    } catch {
      setErrorMsg('Erro de rede. Tente novamente.');
      setStatus('error');
    }
  }

  function handleCancel() {
    setStatus('idle');
  }

  function handleReset() {
    setStatus('idle');
    setSuccessMsg('');
    setErrorMsg('');
  }

  return (
    <div className="rounded-2xl border border-solar-800/20 bg-background-secondary/40 p-6 backdrop-blur-md">

      {/* Confirmação */}
      {status === 'confirm' && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm font-medium text-amber-300">Confirmar operação</p>
          <p className="mt-1 text-sm text-foreground-muted">
            Adicionar{' '}
            <span className="font-semibold text-foreground">
              R$ {parseFloat(form.amountBRL).toFixed(2)}
            </span>{' '}
            para <span className="font-semibold text-foreground">{form.userEmail}</span>
          </p>
          <p className="mt-1 text-xs text-foreground-muted">Motivo: {form.reason}</p>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleConfirm}
              className="rounded-lg bg-solar-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-solar-400"
            >
              Confirmar
            </button>
            <button
              onClick={handleCancel}
              className="rounded-lg border border-solar-800/30 px-4 py-2 text-sm text-foreground-muted transition-all hover:border-solar-500/30"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Sucesso */}
      {status === 'success' && (
        <div className="mb-6 rounded-xl border border-green-500/30 bg-green-500/10 p-4">
          <p className="text-sm font-medium text-green-400">Operação realizada</p>
          <p className="mt-1 text-sm text-foreground-muted">{successMsg}</p>
          <button
            onClick={handleReset}
            className="mt-4 rounded-lg border border-solar-800/30 px-4 py-2 text-sm text-foreground-muted transition-all hover:border-solar-500/30"
          >
            Nova operação
          </button>
        </div>
      )}

      {/* Erro */}
      {status === 'error' && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-sm text-red-400">{errorMsg}</p>
        </div>
      )}

      {/* Formulário */}
      {(status === 'idle' || status === 'error') && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground-muted">
              Email do usuário
            </label>
            <input
              type="email"
              name="userEmail"
              value={form.userEmail}
              onChange={handleChange}
              required
              placeholder="usuario@exemplo.com"
              className="w-full rounded-lg border border-solar-800/30 bg-background-secondary px-3 py-2 text-sm text-foreground placeholder-foreground-muted/50 outline-none transition focus:border-solar-500/50 focus:ring-1 focus:ring-solar-500/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground-muted">
              Valor (R$)
            </label>
            <input
              type="number"
              name="amountBRL"
              value={form.amountBRL}
              onChange={handleChange}
              required
              min="0.01"
              step="0.01"
              placeholder="10.00"
              className="w-full rounded-lg border border-solar-800/30 bg-background-secondary px-3 py-2 text-sm text-foreground placeholder-foreground-muted/50 outline-none transition focus:border-solar-500/50 focus:ring-1 focus:ring-solar-500/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground-muted">
              Motivo
            </label>
            <input
              type="text"
              name="reason"
              value={form.reason}
              onChange={handleChange}
              required
              minLength={3}
              placeholder="Ex: Compensação por instabilidade"
              className="w-full rounded-lg border border-solar-800/30 bg-background-secondary px-3 py-2 text-sm text-foreground placeholder-foreground-muted/50 outline-none transition focus:border-solar-500/50 focus:ring-1 focus:ring-solar-500/20"
            />
          </div>

          <button
            type="submit"
            className="rounded-lg bg-solar-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-solar-400 disabled:opacity-50"
          >
            Adicionar Créditos
          </button>
        </form>
      )}

      {/* Loading */}
      {status === 'loading' && (
        <div className="flex items-center gap-2 text-sm text-foreground-muted">
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Processando...
        </div>
      )}
    </div>
  );
}
