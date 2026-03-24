import { NextRequest, NextResponse } from 'next/server'
import { setReferralCookie } from '@/lib/referral-cookie'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : ''

    if (!code || code.length !== 8) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 })
    }

    // Only allow alphanumeric uppercase codes
    if (!/^[A-Z0-9]{8}$/.test(code)) {
      return NextResponse.json({ error: 'Invalid referral code format' }, { status: 400 })
    }

    await setReferralCookie(code)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
