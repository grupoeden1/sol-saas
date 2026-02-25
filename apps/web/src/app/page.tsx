export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-sans text-sm">
        {/* Hero Section */}
        <div className="flex flex-col items-center gap-8 text-center">
          {/* Logo/Wordmark */}
          <div className="relative">
            <h1 className="text-8xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-solar-300 via-solar-500 to-solar-700 bg-clip-text text-transparent">
                SOL
              </span>
            </h1>
            <p className="mt-2 text-foreground-muted text-lg">
              Criação de Ofertas com Inteligência Artificial
            </p>
          </div>

          {/* Description */}
          <div className="max-w-2xl space-y-4">
            <p className="text-foreground text-lg leading-relaxed">
              Transforme suas ideias em ofertas de infoprodutos diferenciadas e scripts de criativos para anúncios digitais em minutos.
            </p>
            <p className="text-foreground-muted">
              Desenvolvido para alunos do <span className="text-solar-500 font-semibold">Space</span> by Eden Corporate
            </p>
          </div>

          {/* Status Badge */}
          <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-background-secondary px-6 py-3 border border-solar-700/20">
            <div className="h-2 w-2 rounded-full bg-solar-500 animate-pulse" />
            <span className="text-foreground-muted text-sm">
              Em desenvolvimento - Story 1.1 completa ✓
            </span>
          </div>

          {/* Tech Stack Info */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl">
            <TechBadge name="Next.js 14" />
            <TechBadge name="TypeScript" />
            <TechBadge name="Prisma" />
            <TechBadge name="PostgreSQL" />
          </div>
        </div>
      </div>
    </main>
  )
}

function TechBadge({ name }: { name: string }) {
  return (
    <div className="rounded-lg bg-background-secondary border border-solar-800/30 px-4 py-2 text-center">
      <span className="text-foreground-muted text-sm font-medium">{name}</span>
    </div>
  )
}
