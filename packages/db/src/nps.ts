import { prisma } from './index'
import type { CampaignStatus } from '@prisma/client'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface CreateNpsCampaignInput {
  name: string
  question: string
  minDays?: number
  startsAt?: Date
  endsAt?: Date
}

export interface UpdateNpsCampaignInput {
  name?: string
  question?: string
  minDays?: number
  startsAt?: Date | null
  endsAt?: Date | null
}

export interface NpsCampaignMetrics {
  totalResponses: number
  totalViewed: number
  totalDismissed: number
  averageScore: number | null
  distribution: Record<number, number> // { 1: count, 2: count, ..., 5: count }
  responseRate: number // submitted / viewed
}

// ─── Valid status transitions (FSM) ────────────────────────────────────────

const VALID_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  DRAFT: ['ACTIVE'],
  ACTIVE: ['PAUSED', 'ENDED'],
  PAUSED: ['ACTIVE', 'ENDED'],
  ENDED: [],
}

// ─── List NPS campaigns ───────────────────────────────────────────────────

export async function listNpsCampaigns() {
  return prisma.npsCampaign.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { responses: true } },
    },
  })
}

// ─── Create NPS campaign ──────────────────────────────────────────────────

export async function createNpsCampaign(data: CreateNpsCampaignInput) {
  return prisma.npsCampaign.create({
    data: {
      name: data.name,
      question: data.question,
      minDays: data.minDays ?? 7,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
    },
  })
}

// ─── Update NPS campaign ──────────────────────────────────────────────────

export async function updateNpsCampaign(id: string, data: UpdateNpsCampaignInput) {
  return prisma.npsCampaign.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.question !== undefined && { question: data.question }),
      ...(data.minDays !== undefined && { minDays: data.minDays }),
      ...(data.startsAt !== undefined && { startsAt: data.startsAt }),
      ...(data.endsAt !== undefined && { endsAt: data.endsAt }),
    },
  })
}

// ─── Update NPS campaign status ───────────────────────────────────────────

export async function updateNpsCampaignStatus(id: string, newStatus: CampaignStatus) {
  const campaign = await prisma.npsCampaign.findUnique({ where: { id } })
  if (!campaign) throw new Error('Campaign not found')

  const allowed = VALID_TRANSITIONS[campaign.status]
  if (!allowed.includes(newStatus)) {
    throw new Error(`Invalid transition: ${campaign.status} → ${newStatus}`)
  }

  // Only one ACTIVE NPS campaign at a time
  if (newStatus === 'ACTIVE') {
    const existing = await prisma.npsCampaign.findFirst({
      where: { status: 'ACTIVE', id: { not: id } },
    })
    if (existing) {
      throw new Error(`Já existe uma campanha NPS ativa: "${existing.name}". Pause ou encerre-a antes de ativar outra.`)
    }
  }

  return prisma.npsCampaign.update({
    where: { id },
    data: { status: newStatus },
  })
}

// ─── Get NPS campaign metrics ─────────────────────────────────────────────

export async function getNpsCampaignMetrics(campaignId: string): Promise<NpsCampaignMetrics> {
  const responses = await prisma.npsResponse.findMany({
    where: { campaignId },
    select: { score: true, viewedAt: true, submittedAt: true, dismissedAt: true },
  })

  const totalViewed = responses.filter(r => r.viewedAt !== null).length
  const submitted = responses.filter(r => r.submittedAt !== null && r.score !== null)
  const totalDismissed = responses.filter(r => r.dismissedAt !== null).length

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let scoreSum = 0
  for (const r of submitted) {
    const s = r.score!
    distribution[s] = (distribution[s] || 0) + 1
    scoreSum += s
  }

  return {
    totalResponses: submitted.length,
    totalViewed,
    totalDismissed,
    averageScore: submitted.length > 0 ? Math.round((scoreSum / submitted.length) * 10) / 10 : null,
    distribution,
    responseRate: totalViewed > 0 ? Math.round((submitted.length / totalViewed) * 100) : 0,
  }
}

// ─── Preview audience ─────────────────────────────────────────────────────

export async function previewNpsAudience(minDays: number): Promise<number> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - minDays)

  return prisma.user.count({
    where: {
      role: 'USER',
      createdAt: { lte: cutoff },
    },
  })
}

// ─── Get active NPS for user ──────────────────────────────────────────────

export async function getActiveNpsForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  })
  if (!user) return null

  const now = new Date()
  const accountAgeDays = Math.floor((now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))

  // Find ACTIVE campaign within date range
  const campaigns = await prisma.npsCampaign.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { startsAt: null },
        { startsAt: { lte: now } },
      ],
    },
  })

  for (const campaign of campaigns) {
    // Check end date
    if (campaign.endsAt && campaign.endsAt < now) continue

    // Check min days
    if (accountAgeDays < campaign.minDays) continue

    // Check if user already responded/dismissed
    const existing = await prisma.npsResponse.findUnique({
      where: { campaignId_userId: { campaignId: campaign.id, userId } },
    })
    if (existing) continue

    return campaign
  }

  return null
}

// ─── Submit NPS response ──────────────────────────────────────────────────

export async function submitNpsResponse(campaignId: string, userId: string, score: number) {
  return prisma.npsResponse.upsert({
    where: { campaignId_userId: { campaignId, userId } },
    create: {
      campaignId,
      userId,
      score,
      viewedAt: new Date(),
      submittedAt: new Date(),
    },
    update: {
      score,
      submittedAt: new Date(),
    },
  })
}

// ─── Mark NPS as viewed ───────────────────────────────────────────────────

export async function markNpsViewed(campaignId: string, userId: string) {
  return prisma.npsResponse.upsert({
    where: { campaignId_userId: { campaignId, userId } },
    create: {
      campaignId,
      userId,
      viewedAt: new Date(),
    },
    update: {
      // Only set viewedAt if not already set
      viewedAt: new Date(),
    },
  })
}

// ─── Dismiss NPS ──────────────────────────────────────────────────────────

export async function dismissNps(campaignId: string, userId: string) {
  return prisma.npsResponse.upsert({
    where: { campaignId_userId: { campaignId, userId } },
    create: {
      campaignId,
      userId,
      viewedAt: new Date(),
      dismissedAt: new Date(),
    },
    update: {
      dismissedAt: new Date(),
    },
  })
}
