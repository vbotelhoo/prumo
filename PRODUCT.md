# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Público geral brasileiro que perde o controle do orçamento porque compras parceladas e financiamentos espalham compromissos por vários meses futuros. Pessoa física, contexto de finanças pessoais/familiares em BRL. Confirmado em entrevista (2026-07-22): produto aberto, não restrito a uso pessoal do autor.

## Product Purpose

Dar previsibilidade dos gastos futuros: centralizar receitas, despesas, parcelamentos e financiamentos em um só lugar e mostrar quanto dos próximos meses já está comprometido. Sucesso é o usuário saber, a qualquer momento, se está "no prumo" — quanto pode gastar sem comprometer os meses seguintes.

## Positioning

Nenhum app simples mostra claramente "quanto do meu dinheiro dos próximos meses já está comprometido". O mecanismo central do Prumo é a projeção mensal: parcelas materializadas (cada parcela futura é um registro real com vencimento e status) alimentam uma visão mês a mês de entradas previstas, saídas previstas, saldo projetado e total comprometido.

## Operating Context

Duas cenas de uso com peso igual (confirmado em entrevista):

- **Celular, momentos curtos**: conferir saldo e parcelas do mês, marcar parcela como paga — muitas vezes fora de casa.
- **Desktop, sessões de planejamento**: organizar o orçamento no início/fechamento do mês, com tabelas e projeções em tela grande.

Toda a moeda é BRL; formatação pt-BR. URLs em inglês, texto da UI em pt-BR (AD-014).

## Capabilities and Constraints

- MVP completo em produção: auth (e-mail/senha), categorias, transações avulsas, compras parceladas/financiamentos (com regras de arredondamento), projeção mensal, dashboard do mês.
- Stack fixada (não reabrir): Next.js App Router, Tailwind v4 + shadcn/ui, Recharts para gráficos, Better Auth, PostgreSQL/Prisma, deploy Railway. Decisões em `.specs/STATE.md` (AD-001..016).
- Dinheiro sempre em centavos inteiros; formatação apenas via helpers de `shared` (AD-008).
- Fora do escopo atual: integração bancária, mobile nativo, múltiplas moedas, contas compartilhadas, notificações.

## Brand Commitments

- Nome: **Prumo** (identificador técnico `prumo`). Tagline: **"Sua vida financeira alinhada."**
- Significado: instrumento de alinhamento vertical da construção civil + expressão "estar no prumo" (estar em ordem, equilibrado). A metáfora orienta a identidade: linguagem clara e direta, sensação de ordem e equilíbrio, mostrar se o usuário está "no prumo" ou saindo dele.
- Confirmado em entrevista (2026-07-22): sem logo, cores ou referências visuais pré-existentes. A metáfora física do instrumento NÃO é vinculante — o que vincula é o sentido figurado (ordem, alinhamento, equilíbrio).
- **Direção visual firmada (2026-07-23, decisão do usuário na rodada de direção)**: o **padrão da categoria executado com máximo capricho** — app de orçamento pessoal convencional, sem excentricidade, convenções abraçadas sem ironia. Barra de qualidade: **YNAB / Monarch** (hierarquia numérica exemplar, confiança numérica, copy cuidadosa). Direções expressivas (ex.: papel milimetrado/heliografia) foram apresentadas e recusadas em favor do canon.

## Evidence on Hand

- Produto real funcionando em <https://prumo.up.railway.app/> com as capacidades do MVP — demonstrações reais são possíveis com dados de exemplo.
- Não existem depoimentos, números de usuários, casos ou imprensa — nada disso pode ser inventado em superfícies de persuasão.

## Product Principles

1. **Previsibilidade acima de retrospecto**: o produto olha para os próximos meses, não só para o extrato passado.
2. **Clareza direta**: linguagem simples em pt-BR; nada de jargão financeiro ou tom de banco.
3. **Verdade numérica**: valores exatos ao centavo, invariantes garantidas por teste; a UI nunca esconde arredondamento.
4. **Ordem visível**: o usuário deve ver de relance se está "no prumo" — em qualquer tela, em segundos.
5. **Duas cenas, mesma dignidade**: consulta rápida no celular e planejamento no desktop são igualmente primárias.

## Accessibility & Inclusion

WCAG AA como padrão mínimo (contraste ≥ 4.5:1 texto normal, ≥ 3:1 texto grande/UI) nos temas claro e escuro; navegação completa por teclado; landmarks e rótulos acessíveis (requisitos SHELL-14/15/16/21 da feature app-shell).
