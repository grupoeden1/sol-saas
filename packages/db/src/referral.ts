import { prisma } from './index'

// ─── Constants ────────────────────────────────────────────────────────────────

const REFERRAL_CODE_LENGTH = 8
const REFERRAL_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const MAX_CODE_GENERATION_RETRIES = 10

// ─── Generate Referral Code ──────────────────────────────────────────────────

/**
 * Generates a unique 8-character uppercase alphanumeric referral code.
 * Retries on collision up to MAX_CODE_GENERATION_RETRIES times.
 */
export async function generateReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < MAX_CODE_GENERATION_RETRIES; attempt++) {
    let code = ''
    for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
      code += REFERRAL_CODE_CHARS.charAt(
        Math.floor(Math.random() * REFERRAL_CODE_CHARS.length),
      )
    }

    const existing = await prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true },
    })

    if (!existing) {
      return code
    }
  }

  throw new Error(
    `Failed to generate unique referral code after ${MAX_CODE_GENERATION_RETRIES} attempts`,
  )
}

// ─── Validate Referral Code ──────────────────────────────────────────────────

interface ValidateReferralResult {
  valid: boolean
  referrerId?: string
  reason?: string
}

/**
 * Validates a referral code for use during registration.
 * Checks: code exists, program enabled, max not reached, not self-referral.
 */
export async function validateReferralCode(
  code: string,
  newUserId: string,
): Promise<ValidateReferralResult> {
  // Find the user who owns this referral code
  const referrer = await prisma.user.findUnique({
    where: { referralCode: code },
    select: { id: true },
  })

  if (!referrer) {
    return { valid: false, reason: 'code_not_found' }
  }

  // Block self-referral
  if (referrer.id === newUserId) {
    return { valid: false, reason: 'self_referral' }
  }

  // Check if program is enabled
  const enabledConfig = await prisma.pricingConfig.findUnique({
    where: { key: 'REFERRAL_ENABLED' },
  })

  if (!enabledConfig || enabledConfig.value === 0) {
    return { valid: false, reason: 'program_disabled' }
  }

  // Check max referrals per user
  const maxConfig = await prisma.pricingConfig.findUnique({
    where: { key: 'REFERRAL_MAX_PER_USER' },
  })

  const maxPerUser = maxConfig?.value ?? 20

  const currentReferralCount = await prisma.referralReward.count({
    where: {
      referrerId: referrer.id,
      status: { in: ['PENDING', 'CREDITED'] },
    },
  })

  if (currentReferralCount >= maxPerUser) {
    return { valid: false, reason: 'max_reached' }
  }

  return { valid: true, referrerId: referrer.id }
}

// ─── Process Referral Reward ─────────────────────────────────────────────────

interface ProcessReferralResult {
  processed: boolean
  reason?: string
}

/**
 * Processes a PENDING referral reward after a user's first purchase.
 * Awards credits to both referrer and referred user atomically.
 *
 * - If no PENDING reward exists: returns { processed: false }
 * - If program disabled: marks reward as EXPIRED
 * - If program enabled: credits both users, marks reward as CREDITED
 * - Idempotent: skips if already CREDITED or EXPIRED
 */
export async function processReferralReward(
  userId: string,
  transactionId: string,
): Promise<ProcessReferralResult> {
  // Find PENDING reward for this referred user
  const reward = await prisma.referralReward.findFirst({
    where: {
      referredId: userId,
      status: 'PENDING',
    },
  })

  if (!reward) {
    return { processed: false, reason: 'no_pending_reward' }
  }

  // Check if program is enabled
  const configs = await prisma.pricingConfig.findMany({
    where: {
      key: {
        in: [
          'REFERRAL_ENABLED',
          'REFERRAL_REFERRER_CREDITS',
          'REFERRAL_REFERRED_CREDITS',
        ],
      },
    },
  })

  const configMap = new Map(configs.map((c) => [c.key, c.value]))
  const enabled = configMap.get('REFERRAL_ENABLED') ?? 0
  const referrerCredits = configMap.get('REFERRAL_REFERRER_CREDITS') ?? 100
  const referredCredits = configMap.get('REFERRAL_REFERRED_CREDITS') ?? 50

  if (enabled === 0) {
    // Program disabled — mark as EXPIRED
    await prisma.referralReward.update({
      where: { id: reward.id },
      data: { status: 'EXPIRED' },
    })

    console.log(
      `[Referral] Reward ${reward.id} expired — program disabled`,
    )

    return { processed: false, reason: 'program_disabled' }
  }

  // Atomic transaction: credit both users + update reward
  await prisma.$transaction(async (tx) => {
    // Credit the referrer
    if (referrerCredits > 0) {
      await tx.user.update({
        where: { id: reward.referrerId },
        data: { credits: { increment: referrerCredits } },
      })

      await tx.creditTransaction.create({
        data: {
          userId: reward.referrerId,
          amount: referrerCredits,
          type: 'referral',
          description: `Bônus de indicação — você indicou um novo aluno`,
        },
      })
    }

    // Credit the referred user
    if (referredCredits > 0) {
      await tx.user.update({
        where: { id: reward.referredId },
        data: { credits: { increment: referredCredits } },
      })

      await tx.creditTransaction.create({
        data: {
          userId: reward.referredId,
          amount: referredCredits,
          type: 'referral',
          description: `Bônus de indicação — você foi indicado por um amigo`,
        },
      })
    }

    // Update reward status
    await tx.referralReward.update({
      where: { id: reward.id },
      data: {
        status: 'CREDITED',
        triggerTransactionId: transactionId,
        referrerCredits,
        referredCredits,
      },
    })
  })

  console.log(
    `[Referral] Reward ${reward.id} credited — referrer=${referrerCredits} referred=${referredCredits}`,
  )

  return { processed: true }
}

// ─── Get Referral Stats ──────────────────────────────────────────────────────

interface ReferralStatItem {
  maskedEmail: string
  status: string
  createdAt: Date
}

interface ReferralStats {
  referralCode: string | null
  totalReferrals: number
  creditsEarned: number
  referrals: ReferralStatItem[]
}

/**
 * Returns referral stats for a user's dashboard.
 * Emails are masked on the server (never exposed to frontend).
 */
export async function getReferralStats(userId: string): Promise<ReferralStats> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  })

  const rewards = await prisma.referralReward.findMany({
    where: { referrerId: userId },
    include: {
      referred: {
        select: { email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const totalReferrals = rewards.length

  const creditsEarned = rewards
    .filter((r) => r.status === 'CREDITED')
    .reduce((sum, r) => sum + r.referrerCredits, 0)

  const referrals: ReferralStatItem[] = rewards.map((r) => ({
    maskedEmail: maskEmail(r.referred.email),
    status: r.status,
    createdAt: r.createdAt,
  }))

  return {
    referralCode: user?.referralCode ?? null,
    totalReferrals,
    creditsEarned,
    referrals,
  }
}

// ─── Mask Email ──────────────────────────────────────────────────────────────

/**
 * Masks an email address for display: `john@gmail.com` -> `j***@gmail.com`
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@')

  if (!local || !domain) {
    return '***@***'
  }

  if (local.length <= 1) {
    return `${local}***@${domain}`
  }

  return `${local.charAt(0)}***@${domain}`
}
