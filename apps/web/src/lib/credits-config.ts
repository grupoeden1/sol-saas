export interface CreditPackage {
  id: string;
  price: number; // centavos BRL (ex: 2990 = R$29,90)
  label: string;
  description: string;
  scriptsEstimate: string; // estimativa de scripts (exibido na UI)
  popular?: boolean;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    price: 2990,
    label: 'Starter',
    description: '~30 scripts com a IA',
    scriptsEstimate: '~30 scripts',
  },
  {
    id: 'pro',
    price: 6990,
    label: 'Pro',
    description: '~70 scripts com a IA',
    scriptsEstimate: '~70 scripts',
    popular: true,
  },
  {
    id: 'max',
    price: 14990,
    label: 'Max',
    description: '~200 scripts com a IA',
    scriptsEstimate: '~200 scripts',
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
