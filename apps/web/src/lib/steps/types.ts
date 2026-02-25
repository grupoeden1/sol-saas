export type StepType =
  | "ONBOARDING"
  | "AVATAR"
  | "MECANISMO_UNICO"
  | "PRODUTO"
  | "ENTREGAVEL"
  | "VSL"
  | "COPY"
  | "ANUNCIOS"
  | "RESUMO";

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type StepResult = {
  message: string;
  ready_to_advance: boolean;
  tokens?: number;
  model?: string;
};

export type StepHandler = {
  /** OpenAI model to use for this step */
  model: string;
  /** System prompt injected before the conversation */
  systemPrompt: string;
};
