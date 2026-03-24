import { prisma } from '@sol/db';
import { getStripeClient } from './stripe';

/**
 * Gets or creates a Stripe Customer for a given user.
 * If the user already has a stripeCustomerId, returns it.
 * Otherwise, creates a new Stripe Customer, saves the ID on the user, and returns it.
 *
 * @param userId  The internal user ID
 * @param email   The user's email address
 * @returns       The Stripe Customer ID
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
): Promise<string> {
  // Check if user already has a Stripe Customer ID
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (user?.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  // Create a new Stripe Customer
  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });

  // Save the Stripe Customer ID on the user record
  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  console.log(`[StripeCustomer] Created customer=${customer.id} for userId=${userId}`);

  return customer.id;
}
