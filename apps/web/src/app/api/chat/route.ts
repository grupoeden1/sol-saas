import { NextRequest, NextResponse } from "next/server";
import { StepOrchestrator } from "@/lib/orchestrator";
import type { StepType, ChatMessage } from "@/lib/steps/index";

const orchestrator = new StepOrchestrator();

export async function POST(req: NextRequest) {
  try {
    const { messages, step } = (await req.json()) as {
      messages: ChatMessage[];
      step: StepType;
    };

    const result = await orchestrator.processMessage(step, messages);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      {
        message: "Erro interno do servidor. Verifique os logs.",
        error: error instanceof Error ? error.message : "Unknown error",
        ready_to_advance: false,
      },
      { status: 500 }
    );
  }
}
