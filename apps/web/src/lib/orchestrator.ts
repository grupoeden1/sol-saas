import { stepRegistry } from "./steps/index";
import { callAI } from "./prompt-engine";
import type { StepType, ChatMessage, StepResult } from "./steps/types";

const STEP_ORDER: StepType[] = [
  "ONBOARDING",
  "AVATAR",
  "MECANISMO_UNICO",
  "PRODUTO",
  "ENTREGAVEL",
  "VSL",
  "COPY",
  "ANUNCIOS",
  "RESUMO",
];

export class StepOrchestrator {
  /**
   * Process a user message for the given step.
   * Returns the AI response and whether the step is complete.
   */
  async processMessage(
    step: StepType,
    messages: ChatMessage[]
  ): Promise<StepResult> {
    const handler = stepRegistry[step];

    if (!handler) {
      throw new Error(`No handler registered for step: ${step}`);
    }

    return callAI(handler.systemPrompt, messages, handler.model);
  }

  /**
   * Returns the next step in the flow, or null if already at the last step.
   */
  nextStep(currentStep: StepType): StepType | null {
    const idx = STEP_ORDER.indexOf(currentStep);
    if (idx === -1 || idx === STEP_ORDER.length - 1) return null;
    return STEP_ORDER[idx + 1];
  }
}
