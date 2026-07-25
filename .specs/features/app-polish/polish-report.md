# app-polish — T16: Passes critique/polish/harden + detector

Roadmap item 9, Fase 4 (última). Registro dos passes qualitativos sobre as 5
páginas de `/app` (dashboard, transações, compromissos, categorias,
projeções) e do detector mecânico do impeccable, por POLISH-21/22.

## Método

**`⚠️ DEGRADED: single-context (sub-agent tool desabilitado pelas instruções
da task orquestradora — "não dispare sub-agentes adicionais")`**

O comando `critique` do impeccable exige por padrão dois sub-agentes
isolados (Assessment A: design review; Assessment B: detector + evidência de
browser) rodando em paralelo. A task que orquestra esta fase instruiu
explicitamente a não disparar sub-agentes adicionais — o próprio fallback do
comando prevê essa situação ("Inline is allowed ONLY when no sub-agent tool
exists (or the user declined)"). Os três passes (critique, polish, harden)
foram então executados inline, em single-context, sobre as 5 páginas, com:

1. Contexto carregado via `node .../impeccable/scripts/context.mjs --target
   src/app/app` (PRODUCT.md + DESIGN.md + surface brief `src-app-app`
   carregados; ver Named Rules abaixo).
2. Evidência visual real: 20 screenshots (5 páginas × 2 temas × 2 viewports —
   320px e 1280px) via Playwright/Chromium contra o build de produção
   (`pnpm build && pnpm start`), com uma conta seedada (2 transações, 1
   compromisso parcelado, 1 categoria personalizada) para exercitar estados
   não-vazios.
3. Rubrica: DESIGN.md (Acento Raro, Semântica Só em Número, Número Alinhado,
   Ghost Border) + Nielsen heuristics informal, focado em achados acionáveis
   (não uma pontuação formal de /40, dado o contexto degradado).
4. `AUTONOMY_DIRECTIVE_CHECK` do impeccable: sessão é um background job sem
   humano disponível para probe interativo — substituição declarada aqui
   (não na última resposta): procedeu-se com o brief existente (DESIGN.md
   aprovado, sem ambiguidade de direção a resolver).

## Achados e ações

Cada achado abaixo foi corrigido no código ou justificado explicitamente
(nenhum ignorado silenciosamente — POLISH-22).

### Corrigidos

| # | Achado | Onde | Ação |
|---|--------|------|------|
| 1 | `UpcomingInstallmentsList` mostrava a data de vencimento como string ISO crua ("vence em 2026-07-24"), não formatada em pt-BR — e a linha truncava no meio da data ("vence em 2…") porque categoria+data dividiam a mesma âncora truncável. | `src/app/app/_components/UpcomingInstallmentsList.tsx:67-72` | Data isolada num `span shrink-0` que nunca trunca; formatação via novo helper `formatDateBR`. |
| 2 | **Bug de fuso real**: `new Date(isoDate).toLocaleDateString("pt-BR")` (padrão já usado em `TransactionList`) interpreta a data como meia-noite UTC e renderiza no fuso LOCAL do runtime — em qualquer fuso negativo (ex.: `America/Sao_Paulo`, UTC-3, o mercado do produto por AD-014) isso sempre mostra **um dia a menos** que a data real. Verificado: `new Date("2026-07-24").toLocaleDateString("pt-BR")` → `"23/07/2026"` neste ambiente. | `src/modules/transactions/components/TransactionList.tsx:26` (padrão pré-existente, achado ao reusar) | Novo helper `formatDateBR(isoDate)` em `src/shared/date-utils.ts` — manipulação de string pura (`YYYY-MM-DD` → `DD/MM/YYYY`), sem `Date`/fuso envolvido. Aplicado em `TransactionList`, `UpcomingInstallmentsList` e `CommitmentList` (achado #3). Exportado por `src/shared/index.ts`. |
| 3 | `CommitmentList` (parcelas expandidas) mostrava `inst.dueDate` cru, sem formatação nenhuma ("2026-07-24" na tela) — inconsistente com o resto do produto (AD-014, pt-BR). | `src/modules/commitments/components/CommitmentList.tsx:124-128` | `formatDateBR(inst.dueDate)`. |
| 4 | **Layout mobile quebrado** (320px): a linha de `UpcomingInstallmentsList` (descrição + categoria/data + valor + botão) não cabia lado a lado — valor+botão (`shrink-0`) tomavam a maior parte da largura, esmagando a descrição a "N…". | `src/app/app/_components/UpcomingInstallmentsList.tsx:55-61,88` | Empilha em coluna abaixo de `sm` (`flex-col … sm:flex-row`), mesmo padrão já usado no header do dashboard e no `MonthNavigator` (T14). Botão "Marcar como paga" também ganhou `max-sm:min-h-11` (não coberto pelos testes de toque do T14, que cobriram o botão homônimo em `CommitmentList`, não este). |
| 5 | Mesmo bug de layout em `TransactionList` — em 320px "Alimentação"/"Salário" colapsavam para "A…"/quase nada. | `src/modules/transactions/components/TransactionList.tsx:35-52` | Mesmo padrão de empilhamento responsivo. |
| 6 | `MonthNavigator` renderizava "Julho De 2026" em vez de "Julho de 2026" — CSS `capitalize` (text-transform) maiusculiza **cada palavra**, incluindo a preposição "de" no meio da frase (errado em pt-BR). | `src/modules/projections/components/MonthNavigator.tsx:10-18,27-29` | Removida a classe `capitalize`; primeira letra maiusculizada em JS (`rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1)`), preservando `formatMonthLabel` em minúsculas (mesma string, sem `capitalize`, usada corretamente dentro da frase do `DashboardHero`). |

### Verificados e descartados (falso positivo)

| # | Achado aparente | Verificação | Conclusão |
|---|---|---|---|
| 7 | `CategorySpendingChart` (pizza "Gastos por categoria") aparecia vazio nos primeiros screenshots. | Recharts `ResponsiveContainer` mede o container via `ResizeObserver` antes de desenhar; com wait curto (300ms) no script de screenshot o SVG ainda não tinha sido pintado. Re-testado com wait de 1.5s e via `page.locator(".recharts-pie-sector").count()` → renderiza corretamente (1 setor com 1 categoria, 2 setores com 2). | Artefato de timing do próprio script de captura, não um bug do produto — nenhuma ação no código. |

### Considerado, não corrigido (justificativa registrada — POLISH-22)

| # | Achado | Justificativa |
|---|--------|----------------|
| 8 | `--chart-1` (hue 255.5°, "azul") fica visualmente muito próximo de `--primary` (hue 250°, Azul Prumo) — quando uma única categoria domina o gráfico, a fatia usa quase a mesma cor do acento de marca, tensionando a regra **Acento Raro** (que reserva o azul a ação primária/nav ativa/foco). | Decisão já tomada e implementada na Fase 1 (T4) com a skill `dataviz` explicitamente consultada ("Paleta categórica validada: fixed hue anchors, CVD-safe em ordem fixa"). Reabrir a paleta categórica exigiria revalidar CVD-safety do zero e está fora do escopo de um pass de polish da Fase 4 (regra "não refatore código adjacente fora da task"). A cor é de **codificação de dado categórico** dentro de um card isolado (não decoração/estado de UI), o que a regra Acento Raro não tem como alvo primário. Nenhuma ação tomada; registrado aqui para eventual revisão futura se usuários relatarem confusão. |
| 9 | Botões de ação em modais (`TransactionModal`/`CommitmentModal`/`DeleteTransactionDialog`/`DeleteCommitmentDialog`/`DeleteCategoryDialog` — "Criar", "Cancelar", "Excluir" de confirmação) não foram auditados por alvo de toque ≥44px. | T14 escopou os testes de toque aos controles primários das 5 páginas listados explicitamente na task (botões de ação de página, paginação, navegador de mês, toggle de parcela) — não os botões internos de modal, que abririam um escopo de teste substancialmente maior. Nenhuma evidência visual (nos 20 screenshots) sugeriu um problema ali; registrado como lacuna de cobertura, não como achado confirmado. |
| 10 | `CardHeader` de `CommitmentList` usa `onClick` num `<div>` sem `role`/`tabIndex`/`onKeyDown` para expandir as parcelas — não é alcançável por teclado (só mouse/toque). | Notado durante a inspeção de `CommitmentList` para o achado #4, mas fora dos 3 fluxos de teclado explicitamente nomeados pela task T14 (atalho do dashboard, paginação, navegador de mês). Corrigir agora ampliaria o escopo além do que foi pedido nesta fase. Registrado para uma futura iteração de acessibilidade — o achado é real e deveria virar task própria. |

## Detector mecânico

Comando (a partir da raiz do projeto, `node ~/.agents/skills/impeccable/scripts/detect.mjs --json <alvos>`,
funcionou sem MODULE_NOT_FOUND):

**1ª execução — diretórios completos dos alvos da task** (`src/shared/components/ui src/app/app src/modules/*/components`):

```
1 finding: design-system-font-size em src/shared/components/ui/button.tsx:26
  ("text-[0.8rem] class: 0.8rem is off the DESIGN.md type ramp", severity: advisory)
```

Investigado: `button.tsx` é o primitivo shadcn vendorizado (AD-004), com
**zero commits dentro da branch `app-polish`** (`git log --oneline
main..HEAD -- src/shared/components/ui/button.tsx` vazio) — a linha
apontada é de `e3a35ff` (16/07/2026), antes até da Fase 1 desta feature
começar. Escanear diretórios inteiros varre também arquivos pré-existentes
não tocados pela feature.

**2ª execução — lista exata dos arquivos alterados pelas Fases 1–4** (`git
diff --name-only --diff-filter=d main..HEAD -- <alvos>`, 37 arquivos):

```
[]
EXIT_CODE=0 — zero findings
```

**Zero findings nos alvos efetivamente alterados por esta feature** — a
única ocorrência do detector é em código vendorizado pré-existente, fora do
escopo de "alvos alterados" que a task pede.

## Gate final (build)

Executado após todos os fixes acima, na ordem completa do gate `build`:

| Comando | Resultado |
| --- | --- |
| `pnpm typecheck` | OK, 0 erros |
| `pnpm lint` | OK, 0 erros (10 warnings pré-existentes, não relacionados — `no-unused-vars` em testes/domínio de fases anteriores) |
| `pnpm test:unit` | **259 passed**, 0 failed (baseline 249 + 10 novos pares de contraste do T15) |
| `pnpm test:integration` | **156 passed**, 0 failed (baseline mantida) |
| `pnpm test:e2e` (`npx playwright test --workers=2`) | **74–75/76 passed** dependendo da execução; 2 specs pré-existentes (`categories.spec.ts:104` "excluir categoria", `commitments.spec.ts:37` "mark as paid") falham intermitentemente por contenção do Postgres de teste compartilhado sob `router.refresh()` — **verificado via `git stash` que o mesmo padrão de falha (~50% das execuções) já existe na baseline sem nenhuma mudança desta fase** (T14/T15/T16). Não modificados (fora do escopo desta fase; nota operacional herdada de fases anteriores já documentava esse tipo de flake). O teste próprio novo do T14/T16 (`responsive.spec.ts`) passa consistentemente após ganhar o mesmo tratamento de timeout estendido já usado em `categories.spec.ts` para essa classe de contenção. |
| `pnpm build` | OK, build de produção limpo |

Regressão de teste: **nenhuma** (baseline 249 unit/156 integration/63 e2e
mantida e expandida; nenhum teste apagado ou enfraquecido — os únicos ajustes
em testes existentes foram `e2e/dashboard.spec.ts` DASH-09, corrigindo uma
asserção que checava a data ISO crua — comportamento que era o próprio bug
corrigido pelo achado #2 — para checar o formato pt-BR correto).

## Desvio de teste registrado (regra 4)

`e2e/dashboard.spec.ts:300` (`prevista installment appears in the list...
DASH-09`) verificava `row.getByText(today)` com `today` em formato ISO
(`"2026-07-24"`). Essa asserção testava um efeito colateral do bug de
formatação (achado #2), não um critério de aceite deliberado — DASH-11 (o
requisito citado no próprio teste) só exige "mostra... vencimento", sem
especificar formato. Ajustada para `todayBR` (mesma conversão de string,
`DD/MM/YYYY`), preservando a garantia real (a data aparece na linha) e
corrigindo-a para o comportamento correto pós-fix.
