# Prumo

> Aplicação web de controle de finanças pessoais com foco em previsibilidade: centralize receitas, despesas, parcelamentos e financiamentos, e veja quanto dos seus próximos meses já está comprometido.

**Tagline**: Prumo — Sua vida financeira alinhada.

## O nome e seu significado

"Prumo" vem do instrumento usado na construção civil para verificar o alinhamento vertical perfeito — e da expressão popular "estar no prumo": estar em ordem, alinhado, equilibrado. O nome traduz a promessa do produto: tirar a vida financeira do improviso e colocá-la no prumo, com cada compromisso futuro visível e sob controle.

Essa metáfora orienta a identidade do produto: linguagem clara e direta, sensação de ordem e equilíbrio, foco em mostrar ao usuário se ele está "no prumo" ou saindo dele.

## Problema que resolve

Pessoas perdem o controle do orçamento porque compras parceladas e financiamentos espalham compromissos por vários meses futuros, e nenhum app simples mostra claramente "quanto do meu dinheiro dos próximos meses já está comprometido".

O objetivo central do Prumo é dar ao usuário previsibilidade dos gastos futuros, centralizando todas as movimentações financeiras em um só lugar.

## Escopo do MVP

1. **Autenticação**: cadastro e login de usuários (e-mail/senha).
2. **Transações**: cadastro de entradas (receitas) e saídas (despesas) avulsas, com data, valor, descrição e categoria.
3. **Categorias**: categorias padrão + categorias personalizadas por usuário.
4. **Compras parceladas**: cadastro de uma compra com valor total dividido em N parcelas mensais, gerando automaticamente as parcelas futuras.
5. **Dívidas/Financiamentos**: compromissos de longo prazo (ex.: financiamento de carro em 48x), com valor de parcela fixo e acompanhamento de quitação.
6. **Previsibilidade mensal**: visão por mês (atual e futuros) mostrando entradas previstas, saídas previstas (incluindo parcelas), saldo projetado e total já comprometido.
7. **Dashboard**: resumo do mês atual — saldo, gastos por categoria, próximos vencimentos.

### Fora do escopo do MVP

Registrados no [ROADMAP.md](ROADMAP.md) como fases futuras:

- Integração bancária / Open Finance
- App mobile
- Múltiplas moedas
- Compartilhamento de contas (orçamento familiar)
- Notificações de vencimento

## Decisões técnicas (definidas — não reabrir)

Registradas formalmente em `.specs/STATE.md` (AD-001 a AD-012).

| Área | Decisão |
| ---- | ------- |
| Stack | TypeScript full-stack, Next.js 15+ (App Router), monolito modular |
| Banco | PostgreSQL + Prisma ORM |
| Validação | Zod em todos os contratos de entrada/saída (fonte de verdade entre camadas) |
| UI | Tailwind CSS + shadcn/ui; gráficos com Recharts |
| Auth | Better Auth (e-mail/senha no MVP) |
| Deploy | Railway — 1 serviço web + PostgreSQL gerenciado, processo único, config via env vars |
| Nomenclatura | `prumo` (minúsculo, sem acento) em repositório, package.json, banco e serviço Railway |
| Versionamento | GitHub, CI via GitHub Actions |

## Arquitetura: monolito modular

Um único deployável, organizado internamente em módulos de domínio com fronteiras explícitas. As regras completas viverão em `docs/ARCHITECTURE.md` (criado na feature de setup).

### Módulos de domínio

- `auth` — identidade e sessão do usuário
- `categories` — categorias de transações
- `transactions` — entradas e saídas avulsas
- `commitments` — compras parceladas, dívidas e financiamentos (pai + parcelas)
- `projections` — previsibilidade mensal (leitura/agregação sobre os demais)
- `shared` — kernel compartilhado: tipos de dinheiro, datas, utilitários, componentes de UI genéricos. NÃO contém regra de negócio de nenhum domínio.

### Estrutura de pastas

```
src/
├── modules/
│   └── [modulo]/
│       ├── domain/        # tipos, schemas Zod, regras de negócio puras
│       ├── data/          # acesso a dados (repositórios usando Prisma)
│       ├── services/      # casos de uso (orquestram domain + data)
│       ├── actions/       # server actions (fronteira HTTP, valida com Zod)
│       ├── components/    # componentes React do módulo
│       ├── __tests__/     # testes unitários e de integração do módulo
│       └── index.ts       # API PÚBLICA do módulo (único ponto de import externo)
├── app/                   # rotas Next.js (App Router) — apenas composição, sem regra de negócio
└── shared/
e2e/                       # testes Playwright (fora de src/)
```

### Regras de fronteira (invioláveis)

1. Um módulo só importa de outro módulo através do `index.ts` (API pública) do outro. Import de arquivos internos de outro módulo é violação.
2. Regras de negócio vivem em `domain/` e `services/` — nunca em componentes React, rotas do App Router ou server actions.
3. `domain/` não importa Prisma, Next.js ou React: é TypeScript puro e testável isoladamente.
4. Componentes React nunca acessam o banco diretamente; sempre via actions/services do próprio módulo.
5. `projections` é um módulo somente-leitura: consome as APIs públicas de `transactions` e `commitments`, nunca escreve dados deles.
6. Dependências entre módulos devem ser acíclicas. Grafo permitido: auth ← (todos) | categories ← transactions, commitments | transactions, commitments ← projections | shared ← (todos).
7. Lint reforça as fronteiras (eslint-plugin-boundaries ou import rules); violações quebram build e CI.

### Documentação obrigatória

- `README.md`: apresentação com descrição oficial, tagline, significado do nome, problema, como rodar localmente e como executar cada suíte de testes, com badge de CI.
- `docs/ARCHITECTURE.md`: visão do monolito modular, grafo de dependências (mermaid) e regras de fronteira.
- `docs/TESTING.md`: estratégia de testes, execução local, execução no CI, convenções.
- Cada módulo tem um `README.md` curto: responsabilidade, API pública e dependências.
- Toda spec de feature declara QUAIS módulos toca e se altera alguma API pública.

## Regras de domínio críticas

Devem constar nas specs desde o início:

1. **Dinheiro nunca em float**: valores monetários armazenados como inteiros em centavos (Int no Prisma). O tipo `Money` e helpers de formatação BRL (pt-BR) vivem em `shared` e são o ÚNICO caminho para formatar/operar valores monetários.
2. **Parcelas materializadas**: uma compra parcelada gera um registro "pai" (compromisso) e N registros filhos (parcelas), cada um com vencimento e status próprio (prevista | paga). Nada de calcular parcelas on the fly.
3. **Arredondamento de parcelas**: quando o valor total não divide igualmente (ex.: R$ 1.000,00 em 3x), a diferença de centavos vai para a PRIMEIRA parcela. Ex.: 33.334 + 33.333 + 33.333 centavos. A soma das parcelas deve SEMPRE ser igual ao valor total (invariante coberta por teste unitário).
4. **Edição de compromissos**: editar/excluir um compromisso parcelado deve perguntar se afeta só as parcelas futuras (não pagas) ou todas.
5. **Projeção mensal**: o saldo projetado de um mês = entradas previstas do mês − (despesas avulsas + parcelas com vencimento no mês).
6. **Isolamento por usuário**: todo dado é escopado ao usuário autenticado; nenhuma query pode retornar dados de outro usuário. Repositórios em `data/` exigem `userId` como parâmetro obrigatório. Invariante coberta por teste de integração e por teste E2E com duas contas.

## Testes e qualidade

### Pirâmide de testes

1. **Unitários (Vitest)**: cobrem `domain/` e `services/` de cada módulo. Lógica de negócio testável sem Next.js e sem banco real. Prioridade máxima para as invariantes de dinheiro e parcelamento.
2. **Integração (Vitest + Testcontainers ou PostgreSQL de serviço)**: cobrem `data/` (repositórios Prisma) e `actions/` contra um PostgreSQL real descartável. Validam queries, escopo por usuário e contratos Zod na fronteira.
3. **End-to-end (Playwright)**: fluxos críticos no navegador, contra a aplicação completa + banco de teste. Fluxos mínimos do MVP:
   - cadastro → login → logout
   - criar transação de entrada e de saída e vê-las na listagem
   - cadastrar compra parcelada e verificar as parcelas geradas nos meses futuros (incluindo o arredondamento na primeira parcela)
   - marcar parcela como paga e ver o reflexo na projeção
   - visualizar a projeção mensal com saldo projetado correto
   - garantir que um usuário NUNCA vê dados de outro (teste com 2 contas)

### Regras

- Testes derivam dos acceptance criteria das specs — cada feature só é concluída com seus testes passando (unitário/integração sempre; E2E quando a feature tem fluxo de usuário).
- Specs de features com interface devem listar quais fluxos E2E criam ou alteram.
- Nenhum teste pode depender de ordem de execução ou de estado deixado por outro teste.

### CI — GitHub Actions

Workflow `ci.yml` disparado em todo push e pull request para `main`:

1. **Lint & Typecheck**: ESLint (incluindo regras de fronteira de módulos) + `tsc --noEmit`. Violação de fronteira arquitetural quebra o CI.
2. **Testes unitários**: Vitest, com relatório de cobertura.
3. **Testes de integração**: Vitest contra PostgreSQL provisionado como service container, rodando as migrations do Prisma antes da suíte.
4. **Testes E2E**: Playwright contra build de produção do Next.js (`next build` + `next start`) e PostgreSQL de serviço, com upload do relatório como artifact em caso de falha.
5. **Build**: `next build` deve concluir sem erros.

Merge em `main` só com o workflow verde (branch protection recomendada). O deploy no Railway ocorre a partir de `main`, portanto o CI é o portão de qualidade antes de qualquer deploy.
