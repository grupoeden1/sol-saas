/**
 * Converte balanceCents para exibição amigável em "créditos".
 * Aluno nunca vê centavos, reais ou dólares — apenas "créditos".
 *
 * Arquivo sem 'use client' — importável tanto em Server Components quanto Client Components.
 */
export function formatBalance(balanceCents: number): string {
  if (balanceCents <= 0) return '0 créditos';
  const credits = Math.floor(balanceCents / 100);
  if (credits === 0) return '< 1 crédito';
  return `${credits} crédito${credits !== 1 ? 's' : ''}`;
}
