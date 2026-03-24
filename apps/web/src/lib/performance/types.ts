export type ContentType = 'PAID' | 'ORGANIC'
export type PerformanceStatus = 'PRODUCED' | 'PUBLISHED' | 'METRICS' | 'ANALYZED'
export type Classification = 'TERRIBLE' | 'BAD' | 'AVERAGE' | 'GOOD' | 'EXCELLENT'

export interface PerformanceMetrics {
  id: string
  snapshotDay: number
  impressions: number | null
  ctr: number | null
  cpc: number | null
  cpm: number | null
  cpa: number | null
  roas: number | null
  hookRate: number | null
  retention: number | null
  views: number | null
  likes: number | null
  comments: number | null
  shares: number | null
  saves: number | null
  createdAt: string
}

export interface PerformanceData {
  id: string
  conversationId: string
  contentType: ContentType
  status: PerformanceStatus
  niche: string
  awarenessLevel: number
  sophisticationLevel: number
  classification: Classification | null
  metrics: PerformanceMetrics[]
  createdAt: string
  updatedAt: string
}

export const CLASSIFICATION_LABELS: Record<Classification, string> = {
  EXCELLENT: 'Excelente',
  GOOD: 'Bom',
  AVERAGE: 'Mediano',
  BAD: 'Ruim',
  TERRIBLE: 'Péssimo',
}

export const CLASSIFICATION_COLORS: Record<Classification, string> = {
  EXCELLENT: 'bg-green-500/20 text-green-400 border-green-500/30',
  GOOD: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  AVERAGE: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  BAD: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  TERRIBLE: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export const STATUS_LABELS: Record<PerformanceStatus, string> = {
  PRODUCED: 'Produzido',
  PUBLISHED: 'Publicado',
  METRICS: 'Métricas',
  ANALYZED: 'Analisado',
}

export const SNAPSHOT_DAYS = [1, 3, 7, 14, 30] as const
