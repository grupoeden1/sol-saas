# Market Classification Prompt

> Versão: 1.0
> Última atualização: 2026-03-04
> Modelo de execução: Claude Haiku (rápido, baixo custo)
> Referência de arquitetura: [prompt-strategy.md](./prompt-strategy.md)

---

## Sobre este Documento

O Market Classifier é o **primeiro passo** do pipeline de geração de scripts. Ele roda no Claude Haiku e retorna uma classificação estruturada do mercado do aluno, que é usada pelo Prompt Engine para selecionar os módulos contextuais corretos (Layer 2).

---

## Prompt de Classificação

```
Você é um analista de mercado digital especializado em infoprodutos no Brasil.

Analise as informações fornecidas sobre o aluno e seu mercado e retorne uma classificação estruturada em JSON.

## INFORMAÇÕES DO ALUNO
{student_context}

## INSTRUÇÕES DE ANÁLISE

### 1. Nível de Consciência (Schwartz)
Classifique o PÚBLICO-ALVO do aluno em um dos 5 níveis:

- **1 — Unaware (Inconsciente):** O público não sabe que tem um problema. Não procura solução. Exemplo: pessoa sedentária que não percebe que sua falta de energia vem do estilo de vida.

- **2 — Problem-Aware (Consciente do Problema):** O público sabe que tem um problema, mas não conhece soluções possíveis. Exemplo: pessoa que sabe que está cansada o tempo todo, mas não sabe o que fazer.

- **3 — Solution-Aware (Consciente da Solução):** O público conhece tipos de solução (ex: "preciso de uma dieta"), mas não conhece o produto específico do aluno. Exemplo: sabe que treino funcional ajuda, mas nunca ouviu falar do programa do aluno.

- **4 — Product-Aware (Consciente do Produto):** O público já conhece o produto do aluno (já viu anúncio, seguiu perfil, visitou página), mas ainda não comprou. Exemplo: seguidor que já viu 3 vídeos sobre o programa mas não clicou no link.

- **5 — Most Aware (Totalmente Consciente):** O público conhece o produto, confia no aluno, e só precisa de um empurrão final (oferta, urgência, prova social decisiva). Exemplo: lead que já está no grupo de WhatsApp e só falta o cupom.

### 2. Nível de Sofisticação do Mercado
Classifique o MERCADO (não o público individual) em um dos 5 níveis:

- **1 — Virgem:** Ninguém está fazendo ofertas parecidas. Promessas diretas funcionam. "Perca 10kg em 30 dias" converte.

- **2 — Expandido:** Alguns concorrentes, mas promessas diretas maiores ainda funcionam. "Perca 15kg em 21 dias com este método".

- **3 — Diferenciado:** Muitos concorrentes. Promessas diretas já foram saturadas. Precisa de MECANISMO ÚNICO — o "como" diferente. "O Protocolo Metabólico de 3 Fases que..."

- **4 — Cético:** O público já foi bombardeado por promessas. Desconfia de tudo. Precisa de PROVA antes de PROMESSA. Storytelling, demonstração, antes/depois real.

- **5 — Esgotado:** Até provas são questionadas. O público só compra de quem já confia. Precisa de IDENTIDADE e COMUNIDADE. "Eu só compro de quem eu sigo há 6 meses."

### 3. Resumo da Persona
Escreva um parágrafo curto (2-3 frases) descrevendo a persona do público-alvo: quem é, o que sente, o que quer, o que tem medo.

### 4. Ângulos Criativos
Sugira 10 ângulos criativos diferentes para scripts. Cada ângulo deve ser:
- Uma frase curta (máximo 15 palavras)
- Explorável em um script de 30-60 segundos
- Diferente dos outros ângulos da lista
- Adequado ao nível de consciência e sofisticação classificados

### 5. Categorias Recomendadas
Das 7 categorias do SOL, recomende as 3 mais adequadas para este mercado/momento:
1. Venda Direta
2. Autoridade/Educação
3. Opinião/Posicionamento
4. Bastidores/Vulnerabilidade
5. Comunidade/Pertencimento
6. Storytelling/Narrativa
7. Ponte (pessoal→nicho)

### 6. Formatos Recomendados
Recomende 3 formatos de conteúdo mais adequados:
- Reels (15-60s)
- Stories sequenciais
- Carrossel
- VSL curto (1-3min)
- VSL longo (5-15min)
- YouTube longo (10-30min)
- Feed estático
- Live/simulação de live

## FORMATO DE SAÍDA

Retorne APENAS JSON válido, sem markdown, sem explicações:

{
  "consciousness_level": <1-5>,
  "consciousness_label": "<Unaware|Problem-Aware|Solution-Aware|Product-Aware|Most Aware>",
  "sophistication_level": <1-5>,
  "sophistication_label": "<Virgem|Expandido|Diferenciado|Cético|Esgotado>",
  "persona_summary": "<Resumo de 2-3 frases>",
  "creative_angles": [
    "<ângulo 1>",
    "<ângulo 2>",
    "<ângulo 3>",
    "<ângulo 4>",
    "<ângulo 5>",
    "<ângulo 6>",
    "<ângulo 7>",
    "<ângulo 8>",
    "<ângulo 9>",
    "<ângulo 10>"
  ],
  "recommended_categories": ["<cat1>", "<cat2>", "<cat3>"],
  "recommended_formats": ["<format1>", "<format2>", "<format3>"],
  "reasoning": "<Breve justificativa de 1-2 frases para a classificação>"
}
```

---

## Exemplos de Output

### Exemplo 1: Nutricionista — Emagrecimento Feminino

**Input resumido:** Nutricionista, vende programa de emagrecimento para mulheres 30-45, mercado muito concorrido, já tem 50k seguidores, produto de R$297.

```json
{
  "consciousness_level": 3,
  "consciousness_label": "Solution-Aware",
  "sophistication_level": 4,
  "sophistication_label": "Cético",
  "persona_summary": "Mulheres de 30 a 45 anos que já tentaram várias dietas e não conseguiram manter resultados. Estão frustradas com promessas que não cumprem e desconfiam de 'mais um programa de emagrecimento'. Querem algo que funcione na rotina real de mãe/profissional.",
  "creative_angles": [
    "O erro que toda dieta comete depois dos 30",
    "Por que sua nutricionista anterior falhou com você",
    "A conta que eu fiz antes de criar este programa",
    "3 alunas que desistiram e voltaram — o que mudou",
    "Eu parei de prometer emagrecimento rápido",
    "O dia que eu engordei 5kg sendo nutricionista",
    "Sua mãe emagreceria com esse programa (teste real)",
    "Por que eu cobro R$297 e não R$47",
    "O que acontece no dia 22 de toda dieta",
    "Depoimento: ela emagreceu sem cortar carboidrato"
  ],
  "recommended_categories": ["Storytelling/Narrativa", "Bastidores/Vulnerabilidade", "Autoridade/Educação"],
  "recommended_formats": ["Reels (15-60s)", "VSL curto (1-3min)", "Stories sequenciais"],
  "reasoning": "Mercado de emagrecimento feminino é altamente saturado (sof 4). Público já conhece tipos de solução mas não este produto específico (cons 3). Precisa de storytelling e vulnerabilidade para gerar confiança antes da venda."
}
```

### Exemplo 2: Coach de Carreira — Transição Profissional

**Input resumido:** Coach, ajuda profissionais 35-50 a fazerem transição de carreira, mercado relativamente novo no Brasil, produto de R$1.997, 5k seguidores.

```json
{
  "consciousness_level": 2,
  "consciousness_label": "Problem-Aware",
  "sophistication_level": 2,
  "sophistication_label": "Expandido",
  "persona_summary": "Profissionais de 35 a 50 anos que sentem insatisfação na carreira atual mas têm medo de mudar. Ganham razoavelmente bem mas sentem que 'a vida não pode ser só isso'. Têm família e responsabilidades financeiras que tornam a mudança arriscada.",
  "creative_angles": [
    "Você já calculou quantas segundas-feiras faltam até aposentar?",
    "Ele ganhava 15k e pediu demissão — 6 meses depois",
    "O teste de 3 perguntas para saber se você deveria mudar",
    "Por que seus amigos vão te criticar quando você decidir mudar",
    "A planilha que eu uso com todo cliente antes de ele pedir demissão",
    "Transição de carreira não é sobre coragem, é sobre cálculo",
    "O momento exato em que meu cliente de 48 anos chorou na sessão",
    "3 sinais de que você está na carreira errada (e ignora todos)",
    "Quanto custa ficar onde você está?",
    "Ela era gerente de banco — hoje fatura 30k como consultora"
  ],
  "recommended_categories": ["Ponte (pessoal→nicho)", "Storytelling/Narrativa", "Opinião/Posicionamento"],
  "recommended_formats": ["Reels (15-60s)", "YouTube longo (10-30min)", "Carrossel"],
  "reasoning": "Mercado de transição de carreira ainda não é saturado no Brasil (sof 2). O público sabe que está insatisfeito mas não procura ativamente coaching de carreira (cons 2). Precisa de conteúdo que nomeie o problema e mostre que mudança é possível e calculável."
}
```

### Exemplo 3: Personal Trainer — Treino para Idosos

**Input resumido:** Personal trainer, programa de mobilidade e força para 60+, mercado quase inexistente online, produto de R$147/mês, 2k seguidores.

```json
{
  "consciousness_level": 1,
  "consciousness_label": "Unaware",
  "sophistication_level": 1,
  "sophistication_label": "Virgem",
  "persona_summary": "Pessoas acima de 60 anos (ou seus filhos) que normalizam dores, rigidez e perda de mobilidade como 'coisas da idade'. Não procuram treino porque acham que 'não é pra mim' ou que é perigoso. Têm medo de quedas e lesões.",
  "creative_angles": [
    "Sua avó consegue levantar do chão sozinha?",
    "Isso não é coisa da idade — é falta de movimento",
    "Dona Maria, 72 anos, subiu escada sem segurar no corrimão",
    "O exercício mais perigoso depois dos 60 é não fazer nenhum",
    "Por que seu médico nunca te prescreveu treino de força",
    "3 movimentos que previnem 80% das quedas em idosos",
    "Meu pai de 67 anos fez o primeiro agachamento da vida dele",
    "A diferença entre um idoso que treina e um que não treina",
    "Você vai conseguir brincar no chão com seus netos?",
    "Eu gravei minha aluna de 75 anos fazendo isso (vídeo)"
  ],
  "recommended_categories": ["Autoridade/Educação", "Storytelling/Narrativa", "Bastidores/Vulnerabilidade"],
  "recommended_formats": ["Reels (15-60s)", "Feed estático", "Stories sequenciais"],
  "reasoning": "Mercado de treino online para 60+ é praticamente inexistente (sof 1). Público não se vê como candidato a treino (cons 1). Precisa de conteúdo educativo que quebre a crença de que 'é coisa da idade' e mostre transformações reais de pessoas da mesma faixa etária."
}
```

### Exemplo 4: Mentora de Finanças — Investimentos para Mulheres

**Input resumido:** Mentora financeira, ensina mulheres 25-40 a investir, mercado crescente e cada vez mais concorrido, produto de R$497, 120k seguidores.

```json
{
  "consciousness_level": 4,
  "consciousness_label": "Product-Aware",
  "sophistication_level": 3,
  "sophistication_label": "Diferenciado",
  "persona_summary": "Mulheres de 25 a 40 anos que já sabem que deveriam investir e já seguem perfis de educação financeira. Têm renda própria mas ainda não deram o primeiro passo ou investem só em poupança. Sentem-se intimidadas pelo vocabulário financeiro e têm medo de perder dinheiro.",
  "creative_angles": [
    "Você não precisa de mais informação — precisa de um método",
    "O que eu faria com R$500 se começasse hoje do zero",
    "Por que conteúdo grátis de investimento te paralisa mais",
    "A aluna que começou com R$50 e hoje tem 30k investidos",
    "Investir não é sobre ficar rica — é sobre parar de depender",
    "Eu também tinha medo de perder dinheiro (meu primeiro investimento)",
    "O grupo de alunas que se cobra todo mês (funciona melhor que app)",
    "3 erros que eu vejo toda semana no meu grupo de alunas",
    "Sua mãe nunca te ensinou sobre dinheiro — e não foi culpa dela",
    "Por que este programa é diferente de ler 10 livros de finanças"
  ],
  "recommended_categories": ["Comunidade/Pertencimento", "Ponte (pessoal→nicho)", "Venda Direta"],
  "recommended_formats": ["Reels (15-60s)", "VSL curto (1-3min)", "Live/simulação de live"],
  "reasoning": "Mercado de finanças para mulheres está crescendo e se diferenciando (sof 3). Com 120k seguidores, boa parte do público já conhece o produto (cons 4). Precisa de senso de comunidade e pertencimento para converter seguidoras em alunas, além de venda direta para o público quente."
}
```

---

## Comportamento de Fallback

Quando o Market Classifier não recebe informações suficientes para uma classificação confiante, ele deve:

### Cenário 1: Dados insuficientes sobre o público

Se o aluno não informou público-alvo ou informou de forma muito genérica:

```json
{
  "consciousness_level": 3,
  "consciousness_label": "Solution-Aware",
  "sophistication_level": 3,
  "sophistication_label": "Diferenciado",
  "persona_summary": "FALLBACK: Informações insuficientes para definir persona. Usando defaults conservadores. Recomendado coletar mais dados do aluno.",
  "creative_angles": ["...5 ângulos genéricos baseados no nicho informado..."],
  "recommended_categories": ["Autoridade/Educação", "Storytelling/Narrativa", "Ponte (pessoal→nicho)"],
  "recommended_formats": ["Reels (15-60s)", "Carrossel", "Stories sequenciais"],
  "reasoning": "FALLBACK: Dados insuficientes. Defaults conservadores (consciência 3, sofisticação 3) aplicados. O Prompt Engine deve solicitar mais informações ao aluno.",
  "fallback": true,
  "missing_fields": ["target_audience", "audience_demographics"]
}
```

### Cenário 2: Nicho não reconhecido

Se o nicho é incomum ou não tem referências claras:

- Usar `sophistication_level: 2` (presumir mercado pouco explorado)
- Usar `consciousness_level: 2` (presumir público ciente do problema)
- Incluir `"fallback": true` e `"missing_fields": ["niche_benchmarks"]`

### Cenário 3: Erro de parsing ou timeout

Se a resposta do Haiku não é JSON válido ou ocorre timeout:

- O Prompt Engine deve usar defaults hardcoded (consciousness 3, sophistication 3)
- Logar o erro para análise
- Prosseguir com a geração usando módulos default
- NÃO bloquear a experiência do aluno

---

## Notas de Implementação

- O prompt de classificação deve ser executado com `temperature: 0.1` para consistência
- O `student_context` é montado a partir dos dados do formulário do aluno + histórico de conversas
- O campo `reasoning` é usado apenas para debug/logging, não é injetado no prompt final
- O campo `fallback` (quando `true`) dispara um fluxo de coleta de dados adicional no frontend
