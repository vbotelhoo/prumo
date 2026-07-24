---
name: Prumo
description: Sua vida financeira alinhada — app de orçamento pessoal no padrão da categoria, executado no nível YNAB/Monarch.
colors:
  prumo-blue: "oklch(0.48 0.14 250)"
  prumo-blue-foreground: "oklch(0.99 0.002 250)"
  neutral-bg: "oklch(0.985 0.004 250)"
  neutral-fg: "oklch(0.2 0.02 250)"
  neutral-surface: "oklch(1 0 0)"
  neutral-muted: "oklch(0.94 0.006 250)"
  neutral-muted-fg: "oklch(0.48 0.02 250)"
  neutral-border: "oklch(0.9 0.008 250)"
  entrada-verde: "oklch(0.45 0.15 150)"
  saida-vermelho: "oklch(0.5 0.19 25)"
typography:
  display:
    fontFamily: "Geist, \"Geist Fallback\", sans-serif"
    fontSize: "clamp(1.875rem, 3vw, 2.25rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "normal"
  body:
    fontFamily: "Geist, \"Geist Fallback\", sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  mono:
    fontFamily: "Geist Mono, \"Geist Mono Fallback\", monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.625rem"
  xl: "0.875rem"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.prumo-blue}"
    textColor: "{colors.prumo-blue-foreground}"
    rounded: "{rounded.lg}"
    padding: "0 0.625rem"
    height: "2rem"
  button-outline:
    backgroundColor: "{colors.neutral-bg}"
    textColor: "{colors.neutral-fg}"
    rounded: "{rounded.lg}"
    padding: "0 0.625rem"
    height: "2rem"
  nav-item:
    textColor: "{colors.neutral-fg}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
  nav-item-active:
    backgroundColor: "{colors.neutral-muted}"
    textColor: "{colors.prumo-blue}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
---

# Design System: Prumo

## Overview

**Creative North Star: "O Extrato em Ordem"**

O Prumo adota deliberadamente o cânone dos apps de orçamento pessoal — executado com o máximo de capricho, sem ironia nem excentricidade. Decisão do usuário (2026-07-23): direções expressivas foram apresentadas e recusadas; a convenção é o compromisso. A barra de qualidade é YNAB/Monarch: cada tela deve parecer que uma equipe de design madura a lapidou — hierarquia numérica exemplar, densidade calibrada, copy pt-BR clara e direta, zero atrito visual.

O protagonista de toda tela é o número em BRL. Tudo o mais — navegação, cartões, gráficos — existe para dar contexto e ordem a esses números. A personalidade da marca ("estar no prumo": ordem, alinhamento, equilíbrio) se expressa por rigor de alinhamento, ritmo de espaçamento consistente e linguagem calma, nunca por decoração.

**Key Characteristics:**

- Convenção da categoria abraçada sem ironia; craft no nível YNAB/Monarch
- Números tabulares protagonistas, sempre alinhados; hierarquia numérica exemplar
- Neutros frios de baixo croma (hue 250°) + um único acento na mesma família de matiz (estratégia contida); semântica financeira precisa (entrada/saída)
- Temas claro e escuro de primeira classe, ambos WCAG AA (verificado par a par em `src/app/__tests__/theme-contrast.test.ts`)
- Duas cenas com mesma dignidade: consulta rápida mobile (topbar + drawer), planejamento desktop (sidebar fixa)

## Colors

Estratégia contida (Restrained): neutros frios calmos (hue 250, croma baixo) + um único acento de marca na mesma família de matiz, com dupla semântica financeira precisa. Fonte normativa: `src/app/globals.css` (`:root` = tema claro, `.dark` = tema escuro) — nomes de variável shadcn preservados, valores Prumo. Todo par usado pelo shell cumpre AA nos dois temas (teste automatizado).

### Primary

- **Azul Prumo** (`oklch(0.48 0.14 250)` claro / `oklch(0.76 0.13 250)` escuro): o único acento de marca — ação primária, item de navegação ativo (texto sobre a superfície neutra de hover), anel de foco. Raro por princípio (ver regra abaixo).

### Neutral

- **Fundo** (`oklch(0.985 0.004 250)` claro / `oklch(0.17 0.006 250)` escuro): tela base, levemente fria.
- **Superfície elevada** (`oklch(1 0 0)` claro / `oklch(0.22 0.007 250)` escuro): cards, popovers — uma camada tonal acima do fundo, sem depender de sombra.
- **Superfície neutra / hover** (`oklch(0.94 0.006 250)` claro / `oklch(0.27 0.01 250)` escuro): fundo de item ativo de navegação, hover de superfícies secundárias.
- **Texto primário** (`oklch(0.2 0.02 250)` claro / `oklch(0.93 0.004 250)` escuro): corpo de texto e títulos.
- **Texto secundário** (`oklch(0.48 0.02 250)` claro / `oklch(0.66 0.012 250)` escuro): rótulos, metadados, nome do usuário no shell.
- **Borda** (`oklch(0.9 0.008 250)` claro / `oklch(1 0 0 / 10%)` escuro): delimitador de superfície de 1px — abaixo do piso AA de propósito (ver Named Rule).

### Semantic (financeiro)

- **Entrada / positivo** (`oklch(0.45 0.15 150)` claro / `oklch(0.78 0.16 150)` escuro): valores de entrada, saldo positivo.
- **Saída / comprometido / negativo** (`oklch(0.5 0.19 25)` claro / `oklch(0.76 0.17 25)` escuro): valores de saída, saldo negativo, ação destrutiva. Usados APENAS em valores e indicadores financeiros, nunca como decoração.

### Named Rules

**The Acento Raro Rule.** O acento de marca aparece em ≤10% de qualquer tela: ação primária, navegação ativa, foco. Se o acento vira papel de parede, a hierarquia morreu.

**The Semântica Só em Número Rule.** Verde/vermelho financeiros só colorem valores, deltas e estados de parcela — nunca fundos inteiros, ícones decorativos ou títulos.

**The Ghost Border Rule.** `--border`/`--input` ficam deliberadamente abaixo de 4.5:1 — são divisores decorativos entre superfícies já diferenciadas por camada tonal (WCAG 1.4.11 não exige contraste para bordas de baixo relevo). A perceptibilidade de estado interativo vem do anel de foco (`--ring` = acento), esse sim verificado a ≥3:1 nos dois temas.

## Typography

**Display/Body Font:** Geist (`--font-geist-sans`, via `next/font/google`), com fallback `"Geist Fallback"` e pilha `sans-serif`. Face de trabalho (workhorse UI) de alta legibilidade com suporte real a `tabular-nums`.
**Mono:** Geist Mono (`--font-geist-mono`) — reservada a dados tabulares que precisem de largura fixa.
**Números financeiros:** mesma família (Geist) com `font-variant-numeric: tabular-nums` obrigatório em todo valor monetário.

**Character:** Calma, neutra, profissional — a voz de quem organiza, não de quem vende. Nada de display expressivo: a expressividade do Prumo está no rigor, não na letra.

### Hierarchy

- **Display** (peso 600, ~30–36px, `line-height: 1.1`): o número-herói de uma tela (saldo do mês, saldo projetado). Um por viewport.
- **Headline** (~20–24px): títulos de página.
- **Title** (~14–16px, peso médio): títulos de cartão e seção.
- **Body** (peso 400, 14px, `line-height: 1.5`): texto corrente, descrições de transação.
- **Label** (~12–13px, caixa alta opcional com tracking): rótulos de coluna, categorias, datas.

### Named Rules

**The Número Alinhado Rule.** Todo valor monetário usa numerais tabulares e alinha à direita em contexto de coluna/lista. Formatação exclusivamente via helpers de `shared` (AD-008).

## Layout

- **Desktop (≥1024px, breakpoint `lg`)**: sidebar de navegação fixa à esquerda (256px / `w-64`); conteúdo em coluna central com largura máxima confortável para tabelas; grid de cartões no dashboard.
- **Mobile (<1024px)**: barra superior (topbar) com botão de menu abrindo um drawer (`Sheet`, lado esquerdo, mesma largura de 256px) com os mesmos itens/ações da sidebar; conteúdo em coluna única; alvos de toque ≥44px.
- **Ritmo**: escala de espaçamento única (base 4px, via Tailwind); mais espaço acima de um título do que abaixo; densidade maior em tabelas, respiro maior em cartões de resumo.

## Elevation & Depth

Profundidade por camadas tonais (fundo → superfície elevada → superfície de hover, cada uma um passo de luminosidade) + bordas de 1px; sombras discretas (`shadow-lg`) reservadas a elementos flutuantes (drawer, dialog, dropdown — confirmado em `SheetContent`). Superfícies em repouso são planas — nada de sombras ambientes em cards estáticos ou na sidebar.

## Shapes

Cantos suavemente arredondados em escala única a partir de `--radius: 0.625rem` (10px): `sm` 6px, `md` 8px, `lg` 10px (padrão de botões e itens de navegação), `xl` 14px. Bordas de 1px como delimitador padrão de superfície. Sem formas decorativas: a geometria da página é a grade de alinhamento.

## Components

### Buttons

- **Shape:** `rounded-lg` (10px), altura padrão 32px (`h-8`).
- **Primary (`default`):** fundo Azul Prumo, texto branco-sobre-acento; hover reduz opacidade (`hover:bg-primary/80`).
- **Outline:** fundo do tema (transparente sobre a superfície), borda `--border`, hover para superfície neutra (`hover:bg-muted`) — variante do `LogoutButton` e da maioria das ações secundárias.
- **Ghost:** sem fundo em repouso, hover para superfície neutra — base do item de navegação e dos botões do toggle de tema.
- **Destructive:** texto na cor Saída/Vermelho sobre um wash de 10% da mesma cor (`bg-destructive/10`), nunca preenchimento sólido.
- **Focus:** anel de 3px na cor do acento (`focus-visible:ring-ring/50`) sobre borda do acento.

### Navigation (Sidebar / Drawer)

- **Estrutura:** marca "Prumo" (link para `/app`) → lista de 5 itens (`<nav aria-label="Navegação principal">`) → nome do usuário (truncado) + toggle de tema + logout, nessa ordem, fixados ao fundo do painel.
- **Item padrão:** texto cor primária do texto, sem fundo; hover para superfície neutra.
- **Item ativo (`aria-current="page"`):** texto no Azul Prumo sobre a superfície neutra — nunca uma borda lateral colorida (evitado por princípio de craft).
- **Mobile:** mesma estrutura dentro de um `Sheet` (drawer) pela esquerda, acionado por um botão de menu na topbar; fecha ao navegar, `Esc` ou clique no overlay.

### Theme Toggle

- **Estilo:** grupo segmentado de 3 botões texto ("Claro" / "Escuro" / "Sistema") dentro de um container com borda e fundo neutro sutil (`bg-muted/50`).
- **Estado ativo:** fundo Azul Prumo + texto branco-sobre-acento (reaproveita o par `button-primary`); exposto via `aria-pressed`.
- **Rótulo:** `role="group"` com `aria-label="Tema"`.

### Cards / Containers

- **Corner Style:** `rounded-lg` (10px), herdado de `--radius`.
- **Background:** superfície elevada (`--card`), uma camada tonal acima do fundo.
- **Shadow Strategy:** nenhuma em repouso (ver Elevation & Depth).
- **Border:** 1px `--border`.

## Do's and Don'ts

### Do:

- **Do** tratar o número BRL como protagonista: tabular, alinhado, com hierarquia de tamanho/peso clara.
- **Do** manter os dois temas (claro/escuro) de primeira classe, com AA verificado par a par.
- **Do** usar os tokens de `globals.css` como única fonte de cor (requisito SHELL-13).
- **Do** escrever copy pt-BR calma e direta ("Você tem R$ 320 livres em julho"), no nível de cuidado YNAB.
- **Do** indicar navegação ativa por cor de texto + fundo neutro (Azul Prumo sobre superfície de hover), nunca por borda lateral.

### Don't:

- **Don't** introduzir devices expressivos (texturas, metáforas visuais literais de obra, neon, gradientes chamativos) — o canon foi escolhido de propósito.
- **Don't** usar verde/vermelho fora de valores e estados financeiros.
- **Don't** hardcodar cor em componente; tudo via token.
- **Don't** usar float para dinheiro ou formatar BRL fora dos helpers de `shared` (AD-008).
- **Don't** usar sombra em superfícies em repouso (cards, sidebar) — reservada a elementos flutuantes.
