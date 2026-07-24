# Landing Context

**Gathered:** 2026-07-23
**Spec:** `.specs/features/landing/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Página pública completa em `/` (hero com tagline, proposta de valor, seções de funcionalidades, CTAs de "Criar conta" e "Entrar"), shell público compartilhado (header/footer) para `/`, `/login`, `/signup` e `/terms`, e alinhamento visual das páginas de login/cadastro à identidade do DESIGN.md. E2E: visitante anônimo navega da landing até o cadastro/login. Roadmap item 8.

---

## Implementation Decisions

### Usuário autenticado em páginas públicas

- `/` renderiza a landing para todos; quando há cookie de sessão, o header troca "Entrar / Criar conta" por "Ir para o app".
- Detecção via **cookie otimista** (presença do cookie de sessão, sem consulta ao banco) — preserva o edge case "home renderiza com o banco fora do ar" (SETUP-03).
- Trade-off aceito: cookie expirado mostra "Ir para o app"; ao clicar, o usuário cai no fluxo de login normalmente.
- `/login` e `/signup` mantêm o comportamento atual de redirecionar autenticado para `/app` (AUTH AC6) — esta feature não mexe nisso.

### Shell público (header/footer)

- Header: wordmark "Prumo" à esquerda, links de âncora para as seções da landing, CTAs "Entrar" + "Criar conta". Âncoras somem fora da landing.
- Shell compartilhado por **todas as páginas públicas**: `/`, `/login`, `/signup`, `/terms`.
- Footer: wordmark + tagline "Sua vida financeira alinhada.", link para `/terms`, linha de copyright. Nenhum link social/institucional inexistente.
- Toggle de tema (claro/escuro/sistema) presente no header público — mesmo comportamento e persistência do shell logado.

### Hero e prova visual

- Prova visual do hero: **mockup recriado em componentes** — prévia da projeção/dashboard reconstruída como componentes reais da UI com dados de exemplo, nítida nos dois temas, responsiva.
- Seções de proposta de valor: **seções alternadas texto + mini-visual** (um pilar por seção: previsibilidade, parcelas, projeção), alternando lados — padrão do canon YNAB/Monarch.
- Dados de exemplo: **realistas e coerentes** — valores BRL plausíveis, aritmética correta (parcelas somam o total, saldo = entradas − saídas). A "verdade numérica" (PRODUCT.md, princípio 3) vale também no marketing. Nunca dados de usuário real, nunca prova social inventada.

### Restyle de login/cadastro

- Alcance: páginas **e** componentes `LoginForm`/`SignUpForm` do módulo auth ganham polish de apresentação (hierarquia, espaçamento, copy, estados de erro) — **sem mudar comportamento nem validação**; testes existentes continuam valendo.
- Layout: **card centrado** sob o header público.
- `/terms`: só herda o shell público e a tipografia dos tokens; conteúdo placeholder permanece (polish real fica para o item 9).

### Agent's Discretion

- Composição exata das âncoras do header (quais seções listar) e microcopy das seções — dentro do canon e dos princípios do PRODUCT.md.
- Comportamento do header no mobile (ver assumption na spec).

### Declined / Undiscussed Gray Areas → Assumptions

- Header público no mobile (âncoras não cabem): registrado como assumption na spec.
- Metadata/SEO da landing: registrado como assumption na spec.
- Header sticky vs. estático e scroll suave das âncoras: registrado como assumption na spec.

---

## Specific References

- Barra de qualidade: YNAB / Monarch (AD-017, PRODUCT.md Brand Commitments) — canon da categoria com máximo capricho.
- DESIGN.md + tokens de `globals.css` são a única fonte de cor; temas claro/escuro par a par, WCAG AA.

## Deferred Ideas

- Restyle completo do conteúdo de `/terms` → item 9 (app-polish).
