"use client";

import { useState, useRef, useEffect } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type StepInfo = {
  key: string;
  label: string;
  emoji: string;
};

const STEPS: StepInfo[] = [
  { key: "ONBOARDING", label: "Onboarding", emoji: "👋" },
  { key: "AVATAR", label: "Avatar", emoji: "🎯" },
  { key: "MECANISMO_UNICO", label: "Mecanismo Único", emoji: "💡" },
  { key: "PRODUTO", label: "Produto", emoji: "📦" },
  { key: "ENTREGAVEL", label: "Entregável", emoji: "🎁" },
  { key: "VSL", label: "VSL Script", emoji: "🎬" },
  { key: "COPY", label: "Copy de Vendas", emoji: "✍️" },
  { key: "ANUNCIOS", label: "Anúncios", emoji: "📢" },
  { key: "RESUMO", label: "Resumo Final", emoji: "🌟" },
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  // Send welcome message on mount
  useEffect(() => {
    const welcome: Message = {
      id: "welcome",
      role: "assistant",
      content:
        "Olá! 🌞 Eu sou o **Sol**, sua IA especialista em criação de ofertas para produtos digitais.\n\nVou te guiar passo a passo para criar sua oferta completa — do avatar ao script de vendas.\n\nPara começar, me conta: **qual é o seu nicho de atuação?** (ex: emagrecimento, marketing digital, finanças, relacionamentos...)",
    };
    setMessages([welcome]);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          step: STEPS[currentStep].key,
        }),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message || data.error || "Sem resposta",
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Auto-advance step if AI signals ready
      if (data.ready_to_advance && currentStep < STEPS.length - 1) {
        setCurrentStep((prev) => prev + 1);
      }
    } catch (err) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `⚠️ Erro ao conectar com a IA. Verifique se a API key está configurada no \`.env.local\`.\n\nDetalhes: ${err instanceof Error ? err.message : "Erro desconhecido"}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  const progress = Math.round(((currentStep + 1) / STEPS.length) * 100);

  return (
    <div className="flex h-screen">
      {/* Sidebar - Step Tracker */}
      <aside className="w-72 border-r border-border bg-card flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-bold">
            <span className="text-accent">☀️</span> Sol
          </h1>
          <p className="text-sm text-muted mt-1">Crie sua oferta com IA</p>
        </div>

        {/* Steps */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {STEPS.map((step, index) => {
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              return (
                <button
                  key={step.key}
                  onClick={() => setCurrentStep(index)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all ${
                    isActive
                      ? "bg-accent-soft text-accent border border-accent/20"
                      : isCompleted
                        ? "text-foreground/70 hover:bg-card-hover"
                        : "text-muted hover:bg-card-hover"
                  }`}
                >
                  <span className="text-lg">{step.emoji}</span>
                  <span className="flex-1">{step.label}</span>
                  {isCompleted && (
                    <span className="text-success text-xs">✓</span>
                  )}
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Progress bar */}
        <div className="p-4 border-t border-border">
          <div className="flex justify-between text-xs text-muted mb-2">
            <span>Progresso</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-14 border-b border-border flex items-center px-6 bg-card">
          <div className="flex items-center gap-2">
            <span className="text-lg">{STEPS[currentStep].emoji}</span>
            <h2 className="font-semibold">{STEPS[currentStep].label}</h2>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex animate-fade-in ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-accent text-background rounded-br-md"
                    : "bg-card border border-border rounded-bl-md"
                }`}
              >
                {msg.content.split("**").map((part, i) =>
                  i % 2 === 1 ? (
                    <strong key={i} className="font-semibold text-accent-glow">
                      {part}
                    </strong>
                  ) : (
                    <span key={i}>{part}</span>
                  )
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-card border border-border px-4 py-3 rounded-2xl rounded-bl-md flex gap-1.5 items-center">
                <span className="typing-dot w-2 h-2 rounded-full bg-accent" />
                <span className="typing-dot w-2 h-2 rounded-full bg-accent" />
                <span className="typing-dot w-2 h-2 rounded-full bg-accent" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-border p-4 bg-card"
        >
          <div className="flex items-end gap-3 max-w-4xl mx-auto">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
              rows={1}
              disabled={isLoading}
              className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-sm resize-none
                focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20
                disabled:opacity-50 placeholder:text-muted"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-accent hover:bg-accent-glow text-background font-medium px-5 py-3 rounded-xl text-sm
                transition-all disabled:opacity-30 disabled:cursor-not-allowed
                hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]"
            >
              Enviar
            </button>
          </div>
          <p className="text-center text-xs text-muted mt-2">
            Enter para enviar · Shift+Enter para nova linha
          </p>
        </form>
      </main>
    </div>
  );
}
