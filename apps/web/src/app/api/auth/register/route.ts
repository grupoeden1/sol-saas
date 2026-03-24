import { NextResponse } from 'next/server';
import { prisma, generateReferralCode, validateReferralCode } from '@sol/db';
import * as bcrypt from 'bcryptjs';
import { z } from 'zod';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { getReferralCookie, clearReferralCookie } from '@/lib/referral-cookie';

// Prisma error helpers — instanceof can fail with Next.js module bundling
function isPrismaError(err: unknown, code: string): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as Record<string, unknown>).code === code
  );
}
function isPrismaInitError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'errorCode' in err &&
    typeof (err as Record<string, unknown>).message === 'string' &&
    ((err as Record<string, unknown>).message as string).includes('Can\'t reach database')
  ) || (err instanceof Error && err.constructor.name === 'PrismaClientInitializationError');
}

const registerSchema = z.object({
  email: z.string().email('Formato de email inválido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres').max(128),
  ref: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    // Rate limiting: 5 registrations per IP per hour
    const rl = rateLimit(`register:${getClientIp(req)}`, { limit: 5, windowSeconds: 3600 });
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    const { email, password, ref: bodyRef } = parsed.data;

    // Hash da senha com 12 rounds (OWASP recommendation)
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate a unique referral code for the new user
    const referralCode = await generateReferralCode();

    // Create user with referral code
    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        credits: 0,
        referralCode,
      },
      select: { id: true },
    });

    // Process referral: check cookie first, then body param
    const cookieRef = await getReferralCookie().catch(() => null);
    const refCode = cookieRef || bodyRef || null;

    if (refCode) {
      try {
        const validation = await validateReferralCode(refCode, newUser.id);

        if (validation.valid && validation.referrerId) {
          // Set referredBy and create PENDING reward
          await prisma.user.update({
            where: { id: newUser.id },
            data: { referredBy: validation.referrerId },
          });

          await prisma.referralReward.create({
            data: {
              referrerId: validation.referrerId,
              referredId: newUser.id,
              referrerCredits: 0, // Will be set when CREDITED
              referredCredits: 0, // Will be set when CREDITED
              status: 'PENDING',
            },
          });

          console.log(
            `[Register] Referral linked: ${newUser.id} referred by ${validation.referrerId}`,
          );
        } else {
          console.log(
            `[Register] Referral code ignored: ${refCode} reason=${validation.reason}`,
          );
        }
      } catch (refError) {
        // Referral failure must NEVER block registration
        console.error(
          '[Register] Referral processing error (ignored):',
          refError instanceof Error ? refError.message : refError,
        );
      }
    }

    // Clear referral cookie after processing
    await clearReferralCookie().catch(() => {});

    return NextResponse.json(
      { message: 'Conta criada com sucesso' },
      { status: 201 }
    );
  } catch (error) {
    // Email já cadastrado (P2002 = unique constraint violation)
    if (isPrismaError(error, 'P2002')) {
      return NextResponse.json(
        { error: 'Este email já está cadastrado. Tente fazer login.' },
        { status: 409 }
      );
    }

    // Banco de dados inacessível
    if (isPrismaInitError(error)) {
      console.error('[Register] Database connection error:', error instanceof Error ? error.message : error);
      return NextResponse.json(
        { error: 'Serviço temporariamente indisponível. Tente novamente em instantes.' },
        { status: 503 }
      );
    }

    console.error('[Register] Unexpected error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
