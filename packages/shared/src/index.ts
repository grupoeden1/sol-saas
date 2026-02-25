// ==========================================
// Sol — Shared Types
// ==========================================

/** Steps in the offer creation pipeline */
export const STEP_ORDER = [
  "ONBOARDING",
  "AVATAR",
  "MECANISMO_UNICO",
  "PRODUTO",
  "ENTREGAVEL",
  "VSL",
  "COPY",
  "ANUNCIOS",
  "RESUMO",
] as const;

export type StepType = (typeof STEP_ORDER)[number];

/** Step metadata for UI */
export const STEP_META: Record<
  StepType,
  { label: string; emoji: string; description: string; kestraFlowId: string }
> = {
  ONBOARDING: {
    label: "Onboarding",
    emoji: "👋",
    description: "Conte sobre seu nicho e objetivos",
    kestraFlowId: "onboarding",
  },
  AVATAR: {
    label: "Avatar",
    emoji: "🎯",
    description: "Defina seu cliente ideal",
    kestraFlowId: "avatar-builder",
  },
  MECANISMO_UNICO: {
    label: "Mecanismo Único",
    emoji: "💡",
    description: "Crie sua proposta de valor única",
    kestraFlowId: "mecanismo-unico",
  },
  PRODUTO: {
    label: "Produto",
    emoji: "📦",
    description: "Defina seu produto digital",
    kestraFlowId: "produto-definition",
  },
  ENTREGAVEL: {
    label: "Entregável",
    emoji: "🎁",
    description: "Estruture módulos, bônus e garantia",
    kestraFlowId: "entregavel-bonus",
  },
  VSL: {
    label: "VSL Script",
    emoji: "🎬",
    description: "Gere seu roteiro de vídeo de vendas",
    kestraFlowId: "vsl-script",
  },
  COPY: {
    label: "Copy de Vendas",
    emoji: "✍️",
    description: "Textos para página, emails e WhatsApp",
    kestraFlowId: "copy-vendas",
  },
  ANUNCIOS: {
    label: "Anúncios",
    emoji: "📢",
    description: "Criativos para Meta e Google Ads",
    kestraFlowId: "anuncios",
  },
  RESUMO: {
    label: "Resumo Final",
    emoji: "🌟",
    description: "Sua oferta completa consolidada",
    kestraFlowId: "resumo-final",
  },
};

/** Get next step in the pipeline */
export function getNextStep(current: StepType): StepType | null {
  const idx = STEP_ORDER.indexOf(current);
  return idx < STEP_ORDER.length - 1 ? STEP_ORDER[idx + 1] : null;
}

/** Get previous step */
export function getPreviousStep(current: StepType): StepType | null {
  const idx = STEP_ORDER.indexOf(current);
  return idx > 0 ? STEP_ORDER[idx - 1] : null;
}

/** Get step progress percentage */
export function getStepProgress(current: StepType): number {
  const idx = STEP_ORDER.indexOf(current);
  return Math.round(((idx + 1) / STEP_ORDER.length) * 100);
}
