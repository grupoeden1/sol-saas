import { cookies } from 'next/headers'

const COOKIE_NAME = 'sol_ref'
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 // 30 days in seconds

/**
 * Sets the referral cookie (server-side, Next.js cookies API).
 */
export async function setReferralCookie(code: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, code, {
    httpOnly: true,
    maxAge: COOKIE_MAX_AGE,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })
}

/**
 * Gets the referral code from the cookie (server-side).
 */
export async function getReferralCookie(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_NAME)?.value ?? null
}

/**
 * Clears the referral cookie (server-side).
 */
export async function clearReferralCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    maxAge: 0,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })
}
