/**
 * Formata créditos inteiros para exibição amigável.
 * Aluno nunca vê centavos, reais ou dólares — apenas "créditos".
 *
 * Arquivo sem 'use client' — importável tanto em Server Components quanto Client Components.
 */
export function formatBalance(credits: number): string {
  if (credits <= 0) return '0 créditos';
  return `${credits} crédito${credits !== 1 ? 's' : ''}`;
}
