import type { StepType, StepHandler } from "./types";
import { onboardingHandler } from "./onboarding";
import { avatarHandler } from "./avatar";
import { mecanismoUnicoHandler } from "./mecanismo-unico";
import { produtoHandler } from "./produto";
import { entregavelHandler } from "./entregavel";
import { vslHandler } from "./vsl";
import { copyHandler } from "./copy";
import { anunciosHandler } from "./anuncios";
import { resumoHandler } from "./resumo";

export const stepRegistry: Record<StepType, StepHandler> = {
  ONBOARDING: onboardingHandler,
  AVATAR: avatarHandler,
  MECANISMO_UNICO: mecanismoUnicoHandler,
  PRODUTO: produtoHandler,
  ENTREGAVEL: entregavelHandler,
  VSL: vslHandler,
  COPY: copyHandler,
  ANUNCIOS: anunciosHandler,
  RESUMO: resumoHandler,
};

export type { StepType, StepHandler, ChatMessage, StepResult } from "./types";
