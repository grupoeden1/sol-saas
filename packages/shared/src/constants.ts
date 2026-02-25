// ==========================================
// Sol — Constants
// ==========================================

/** Plan limits */
export const PLAN_LIMITS = {
  FREE: { offersPerMonth: 1, models: ["gpt-4o-mini"] as const },
  PRO: { offersPerMonth: 10, models: ["gpt-4o", "gpt-4o-mini"] as const },
  UNLIMITED: { offersPerMonth: Infinity, models: ["gpt-4o", "gpt-4o-mini", "claude-3.5-sonnet"] as const },
  MENTORES: { offersPerMonth: Infinity, models: ["gpt-4o", "gpt-4o-mini", "claude-3.5-sonnet"] as const },
} as const;

/** Kestra configuration */
export const KESTRA = {
  NAMESPACE: "sol.offers",
  MASTER_FLOW: "offer-pipeline",
} as const;

/** AI Model configuration */
export const AI_MODELS = {
  PRIMARY: "gpt-4o",
  ITERATION: "gpt-4o-mini",
  FALLBACK: "claude-3.5-sonnet",
} as const;
