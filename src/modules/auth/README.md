# Módulo `auth`

## Responsabilidade

Identidade e sessão do usuário: cadastro, login/logout, e gestão de sessão via Better Auth (e-mail/senha no MVP). Todo dado das demais features é escopado ao usuário autenticado por este módulo (AD-012).

## API pública

Hoje vazia (placeholder criado no setup — Fase 1). A partir da Fase 3 (Persistência + Better Auth), `index.ts` passa a exportar a instância Better Auth (`auth`) configurada com adapter Prisma e provider e-mail/senha.

## Dependências permitidas

Segue o grafo de fronteiras (AD-010, reforçado por `eslint-plugin-boundaries`):

- **Pode importar**: `shared` (via `src/shared`'s `index.ts`).
- **É importável por**: `categories`, `transactions`, `commitments`, `projections` (todos os demais módulos de domínio), e por `src/app` (camada de composição), sempre através deste `index.ts`.
- Import de arquivos internos deste módulo (`domain/`, `data/`, `services/`, `actions/`, `components/`) por qualquer código fora dele é uma violação de fronteira.
