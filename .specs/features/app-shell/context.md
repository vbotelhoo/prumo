# app-shell — Contexto (decisões do usuário)

Decisões capturadas na fase Discuss (2026-07-22), via entrevista estruturada:

| # | Área cinzenta | Decisão do usuário |
| --- | ------------- | ------------------ |
| 1 | Ordem da Fase 2 | **Shell de navegação primeiro**, landing page depois — resolve a dor de quem já usa o produto todo dia. |
| 2 | Escopo da landing (item 8) | **Landing completa** (hero, proposta de valor, funcionalidades, CTAs) — registrada aqui só para contexto; fora do escopo desta feature. |
| 3 | Fundação de design | **Embutida nesta feature**: identidade visual (paleta, tipografia, tom) definida via `impeccable init`/`new-work` junto com o shell; PRODUCT.md e DESIGN.md criados aqui; features seguintes herdam o sistema. |
| 4 | Padrão de navegação | **Sidebar fixa** à esquerda no desktop, com colapso no mobile. |
| 5 | Dark mode (ajuste de 2026-07-22) | **Em escopo nesta feature**: segue a preferência do sistema por padrão, com toggle claro/escuro/sistema no shell e escolha persistida entre sessões. |

Contexto de código relevante (scan de 2026-07-22):

- `src/app/app/layout.tsx` faz apenas o guard de sessão (`auth.api.getSession`) e retorna `children` — é o ponto natural para montar o shell.
- Logout já existe como API pública do módulo `auth`: `LogoutButton` (form + `signOutAction`) — o shell reutiliza, não reimplementa.
- Rotas da área logada: `/app` (dashboard), `/app/transactions`, `/app/commitments`, `/app/categories`, `/app/projections`.
- Tema: Tailwind v4 + tokens shadcn/ui default em `globals.css`; variante `dark` definida mas nunca ativada (nenhum toggle aplica `.dark`) — o app é efetivamente light-only hoje.
