<!-- SEED: established with the user before implementation; re-run $impeccable document once there's code to capture the actual tokens and components. -->

---
name: Prumo
description: Sua vida financeira alinhada — app de orçamento pessoal no padrão da categoria, executado no nível YNAB/Monarch.
---

# Design System: Prumo

## Overview

**Creative North Star: "O Extrato em Ordem"**

O Prumo adota deliberadamente o cânone dos apps de orçamento pessoal — executado com o máximo de capricho, sem ironia nem excentricidade. Decisão do usuário (2026-07-23): direções expressivas foram apresentadas e recusadas; a convenção é o compromisso. A barra de qualidade é YNAB/Monarch: cada tela deve parecer que uma equipe de design madura a lapidou — hierarquia numérica exemplar, densidade calibrada, copy pt-BR clara e direta, zero atrito visual.

O protagonista de toda tela é o número em BRL. Tudo o mais — navegação, cartões, gráficos — existe para dar contexto e ordem a esses números. A personalidade da marca ("estar no prumo": ordem, alinhamento, equilíbrio) se expressa por rigor de alinhamento, ritmo de espaçamento consistente e linguagem calma, nunca por decoração.

**Key Characteristics:**

- Convenção da categoria abraçada sem ironia; craft no nível YNAB/Monarch
- Números tabulares protagonistas, sempre alinhados; hierarquia numérica exemplar
- Neutros + um acento (estratégia contida); semântica financeira precisa (entrada/saída)
- Temas claro e escuro de primeira classe, ambos WCAG AA
- Duas cenas com mesma dignidade: consulta rápida mobile, planejamento desktop

## Colors

Estratégia contida (Restrained): neutros calmos + um acento de marca, com dupla semântica financeira precisa. Valores exatos `[to be resolved during implementation]` — a primeira implementação do shell os estabelece em `src/app/globals.css` (fonte normativa dos tokens, temas claro e escuro).

### Primary

- **Acento Prumo** `[to be resolved during implementation]`: um único acento de marca para ação primária, item de navegação ativo e foco. Raro por princípio (ver regra abaixo).

### Neutral

- **Fundos e superfícies** `[to be resolved during implementation]`: neutros levemente aquecidos ou frios (decisão de implementação), com camadas de superfície distinguíveis nos dois temas sem depender de sombra.
- **Texto** `[to be resolved during implementation]`: dois níveis (primário/secundário) + desabilitado; contraste AA nos dois temas.

### Semantic (financeiro)

- **Entrada (positivo)** e **Saída/comprometido (negativo)** `[to be resolved during implementation]`: pares claro/escuro com AA garantido; usados APENAS em valores e indicadores financeiros, nunca como decoração.

### Named Rules

**The Acento Raro Rule.** O acento de marca aparece em ≤10% de qualquer tela: ação primária, navegação ativa, foco. Se o acento vira papel de parede, a hierarquia morreu.

**The Semântica Só em Número Rule.** Verde/vermelho financeiros só colorem valores, deltas e estados de parcela — nunca fundos inteiros, ícones decorativos ou títulos.

## Typography

**Display/Body Font:** `[to be resolved during implementation]` — face de trabalho (workhorse UI) de alta legibilidade; a escolha exige suporte real a `tabular-nums`.
**Números financeiros:** mesma família com `font-variant-numeric: tabular-nums` obrigatório, ou família própria para dados se a principal não servir.

**Character:** Calma, neutra, profissional — a voz de quem organiza, não de quem vende. Nada de display expressivo: a expressividade do Prumo está no rigor, não na letra.

### Hierarchy

- **Display** (peso forte, ~30–36px): o número-herói de uma tela (saldo do mês, saldo projetado). Um por viewport.
- **Headline** (~20–24px): títulos de página.
- **Title** (~14–16px, peso médio): títulos de cartão e seção.
- **Body** (~14–16px): texto corrente, descrições de transação.
- **Label** (~12–13px, caixa alta opcional com tracking): rótulos de coluna, categorias, datas.

### Named Rules

**The Número Alinhado Rule.** Todo valor monetário usa numerais tabulares e alinha à direita em contexto de coluna/lista. Formatação exclusivamente via helpers de `shared` (AD-008).

## Layout

- **Desktop (≥1024px)**: sidebar de navegação fixa à esquerda (~240–260px); conteúdo em coluna central com largura máxima confortável para tabelas; grid de cartões no dashboard.
- **Mobile (<1024px)**: barra superior com menu (drawer); conteúdo em coluna única; alvos de toque ≥44px.
- **Ritmo**: escala de espaçamento única (base 4px, via Tailwind); mais espaço acima de um título do que abaixo; densidade maior em tabelas, respiro maior em cartões de resumo.

## Elevation & Depth

Profundidade por camadas tonais (superfícies levemente distintas do fundo) + bordas de 1px; sombras discretas reservadas a elementos flutuantes (drawer, dialog, dropdown). Superfícies em repouso são planas — nada de sombras ambientes em cards estáticos.

## Shapes

Cantos suavemente arredondados (herança shadcn/ui, raio médio consistente); bordas de 1px como delimitador padrão de superfície. Sem formas decorativas: a geometria da página é a grade de alinhamento.

## Do's and Don'ts

### Do:

- **Do** tratar o número BRL como protagonista: tabular, alinhado, com hierarquia de tamanho/peso clara.
- **Do** manter os dois temas (claro/escuro) de primeira classe, com AA verificado par a par.
- **Do** usar os tokens de `globals.css` como única fonte de cor (requisito SHELL-13).
- **Do** escrever copy pt-BR calma e direta ("Você tem R$ 320 livres em julho"), no nível de cuidado YNAB.

### Don't:

- **Don't** introduzir devices expressivos (texturas, metáforas visuais literais de obra, neon, gradientes chamativos) — o canon foi escolhido de propósito.
- **Don't** usar verde/vermelho fora de valores e estados financeiros.
- **Don't** hardcodar cor em componente; tudo via token.
- **Don't** usar float para dinheiro ou formatar BRL fora dos helpers de `shared` (AD-008).
