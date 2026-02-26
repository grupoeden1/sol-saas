export interface CreditPackage {
  id: string;
  credits: number;
  price: number; // centavos BRL (ex: 1990 = R$19,90)
  label: string;
  description: string;
  popular?: boolean;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    credits: 100,
    price: 2990,
    label: 'Starter',
    description: '100 mensagens com a IA',
  },
  {
    id: 'pro',
    credits: 250,
    price: 6990,
    label: 'Pro',
    description: '250 mensagens com a IA',
    popular: true,
  },
  {
    id: 'max',
    credits: 750,
    price: 14990,
    label: 'Max',
    description: '750 mensagens com a IA',
  },
];

export function findPackage(id: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((p) => p.id === id);
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}
