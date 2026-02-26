import Stripe from 'stripe';

// Lazy initialization — o cliente só é criado na primeira chamada ao checkout.
// Evita throw no nível de módulo que trava a rota quando STRIPE_SECRET_KEY ainda
// não está carregada no ambiente (ex: hot-reload do dev server).
let _stripe: Stripe | undefined;

export function getStripeClient(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
    }
    _stripe = new Stripe(key);
  }
  return _stripe;
}
