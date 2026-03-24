import { prisma } from './index'
import type { CampaignStatus, OfferType, Prisma } from '@prisma/client'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface CampaignFilters {
  creditsMin?: number
  creditsMax?: number
  inactiveDays?: number
  messagesMin?: number
  messagesMax?: number
}

export interface CreateCampaignInput {
  name: string
  title: string
  message: string
  offerType: OfferType
  offerId?: string
  discountPercent?: number
  filters: CampaignFilters
  startsAt?: Date
  endsAt?: Date
}

export interface UpdateCampaignInput {
  name?: string
  title?: string
  message?: string
  offerType?: OfferType
  offerId?: string | null
  discountPercent?: number | null
  filters?: CampaignFilters
  startsAt?: Date | null
  endsAt?: Date | null
}

export interface CampaignMetrics {
  totalDeliveries: number
  viewed: number
  clicked: number
  converted: number
  dismissed: number
  viewRate: number
  clickRate: number
  conversionRate: number
  dismissRate: number
}

// ─── List campaigns ────────────────────────────────────────────────────────

export async function listCampaigns(filters?: { status?: CampaignStatus }) {
  const where: Prisma.PromoCampaignWhereInput = {}

  if (filters?.status) {
    where.status = filters.status
  }

  return prisma.promoCampaign.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { deliveries: true } },
    },
  })
}

// ─── Create campaign ───────────────────────────────────────────────────────

export async function createCampaign(data: CreateCampaignInput) {
  return prisma.promoCampaign.create({
    data: {
      name: data.name,
      title: data.title,
      message: data.message,
      offerType: data.offerType,
      offerId: data.offerId ?? null,
      discountPercent: data.discountPercent ?? null,
      filters: data.filters as Prisma.InputJsonValue,
      status: 'DRAFT',
      startsAt: data.startsAt ?? null,
      endsAt: data.endsAt ?? null,
    },
    include: {
      _count: { select: { deliveries: true } },
    },
  })
}

// ─── Update campaign ───────────────────────────────────────────────────────

export async function updateCampaign(id: string, data: UpdateCampaignInput) {
  return prisma.promoCampaign.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.title !== undefined && { title: data.title }),
      ...(data.message !== undefined && { message: data.message }),
      ...(data.offerType !== undefined && { offerType: data.offerType }),
      ...(data.offerId !== undefined && { offerId: data.offerId }),
      ...(data.discountPercent !== undefined && { discountPercent: data.discountPercent }),
      ...(data.filters !== undefined && { filters: data.filters as Prisma.InputJsonValue }),
      ...(data.startsAt !== undefined && { startsAt: data.startsAt }),
      ...(data.endsAt !== undefined && { endsAt: data.endsAt }),
    },
    include: {
      _count: { select: { deliveries: true } },
    },
  })
}

// ─── Update campaign status ────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  DRAFT: ['ACTIVE'],
  ACTIVE: ['PAUSED', 'ENDED'],
  PAUSED: ['ACTIVE', 'ENDED'],
  ENDED: [],
}

export async function updateCampaignStatus(id: string, newStatus: CampaignStatus) {
  const campaign = await prisma.promoCampaign.findUniqueOrThrow({ where: { id } })

  const allowed = VALID_TRANSITIONS[campaign.status]
  if (!allowed || !allowed.includes(newStatus)) {
    throw new Error(
      `Invalid status transition: ${campaign.status} -> ${newStatus}`,
    )
  }

  return prisma.promoCampaign.update({
    where: { id },
    data: { status: newStatus },
    include: {
      _count: { select: { deliveries: true } },
    },
  })
}

// ─── Get campaign metrics ──────────────────────────────────────────────────

export async function getCampaignMetrics(id: string): Promise<CampaignMetrics> {
  const deliveries = await prisma.promoDelivery.findMany({
    where: { campaignId: id },
    select: {
      viewedAt: true,
      clickedAt: true,
      convertedAt: true,
      dismissedAt: true,
    },
  })

  const totalDeliveries = deliveries.length
  const viewed = deliveries.filter((d) => d.viewedAt !== null).length
  const clicked = deliveries.filter((d) => d.clickedAt !== null).length
  const converted = deliveries.filter((d) => d.convertedAt !== null).length
  const dismissed = deliveries.filter((d) => d.dismissedAt !== null).length

  return {
    totalDeliveries,
    viewed,
    clicked,
    converted,
    dismissed,
    viewRate: totalDeliveries > 0 ? Math.round((viewed / totalDeliveries) * 10000) / 100 : 0,
    clickRate: viewed > 0 ? Math.round((clicked / viewed) * 10000) / 100 : 0,
    conversionRate: clicked > 0 ? Math.round((converted / clicked) * 10000) / 100 : 0,
    dismissRate: viewed > 0 ? Math.round((dismissed / viewed) * 10000) / 100 : 0,
  }
}

// ─── Preview campaign audience ─────────────────────────────────────────────

export async function previewCampaignAudience(filters: CampaignFilters): Promise<number> {
  const where: Prisma.UserWhereInput = { role: 'USER' }

  // Credits filters
  if (filters.creditsMin !== undefined || filters.creditsMax !== undefined) {
    where.credits = {}
    if (filters.creditsMin !== undefined) {
      where.credits.gte = filters.creditsMin
    }
    if (filters.creditsMax !== undefined) {
      where.credits.lte = filters.creditsMax
    }
  }

  // Inactive days filter: users whose last message was N or more days ago
  if (filters.inactiveDays !== undefined && filters.inactiveDays > 0) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - filters.inactiveDays)

    // Users who have NO messages after the cutoff date
    where.conversations = {
      every: {
        messages: {
          every: {
            createdAt: { lt: cutoff },
          },
        },
      },
    }
  }

  // Messages min/max filters — use raw count approach
  if (filters.messagesMin !== undefined || filters.messagesMax !== undefined) {
    // We need to do a subquery — use raw SQL for the count filter
    type UserIdRow = { userId: string }

    let havingClause = ''
    const havingParts: string[] = []

    if (filters.messagesMin !== undefined) {
      havingParts.push(`COUNT(m.id) >= ${filters.messagesMin}`)
    }
    if (filters.messagesMax !== undefined) {
      havingParts.push(`COUNT(m.id) <= ${filters.messagesMax}`)
    }

    if (havingParts.length > 0) {
      havingClause = `HAVING ${havingParts.join(' AND ')}`
    }

    const userIdsWithMsgCount = await prisma.$queryRawUnsafe<UserIdRow[]>(
      `SELECT c."userId"
       FROM "Message" m
       JOIN "Conversation" c ON m."conversationId" = c.id
       WHERE m.role = 'user'
       GROUP BY c."userId"
       ${havingClause}`,
    )

    const validUserIds = userIdsWithMsgCount.map((r) => r.userId)

    if (validUserIds.length === 0) {
      return 0
    }

    where.id = { in: validUserIds }
  }

  return prisma.user.count({ where })
}
