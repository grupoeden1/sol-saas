import { auth } from '@/lib/auth'
import { prisma } from '@sol/db'

// GET - return user's expert profile (or null)
export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return new Response('Unauthorized', { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!user) return new Response('Not found', { status: 404 })

  const profile = await prisma.expertProfile.findUnique({
    where: { userId: user.id },
  })

  return Response.json(profile)
}

// PUT - upsert expert profile
export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return new Response('Unauthorized', { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!user) return new Response('Not found', { status: 404 })

  const body = await req.json()

  // Calculate completion percentage based on 14 required fields
  const REQUIRED_FIELDS = [
    'fullName', 'occupation', 'communicationStyle', 'appearsOnCamera',
    'preferredTone', 'coreValues', 'marketFrustration', 'bio',
    'careerOrigin', 'audienceIdentity', 'communityName', 'inspirations',
    'age', 'location'
  ]

  const filledRequired = REQUIRED_FIELDS.filter(field => {
    const val = body[field]
    if (Array.isArray(val)) return val.length > 0
    return val !== null && val !== undefined && val !== ''
  }).length

  const completionPercentage = Math.round((filledRequired / REQUIRED_FIELDS.length) * 100)

  // Remove fields that shouldn't be set directly
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, userId, createdAt, updatedAt, completionPercentage: _, ...profileData } = body

  const profile = await prisma.expertProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      ...profileData,
      completionPercentage,
    },
    update: {
      ...profileData,
      completionPercentage,
    },
  })

  return Response.json(profile)
}
